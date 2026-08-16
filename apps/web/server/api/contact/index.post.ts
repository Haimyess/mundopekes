import { z } from 'zod'
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'
import { logError, logInfo } from '../../utils/logger'
import type { ContactIntent } from '~/app/types/contact'

const bodySchema = z.object({
  intent: z.enum(['outdated_activity', 'feedback', 'provider_inquiry', 'other']),
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  activityId: z.string().uuid().optional(),
  activityTitle: z.string().optional(),
  locale: z.string().optional().default('es'),
})

const INTENT_LABELS: Record<ContactIntent, string> = {
  outdated_activity: '🐛 Información desactualizada',
  feedback: '💬 Feedback sobre la web',
  provider_inquiry: '🏢 Soy proveedor',
  other: '💡 Otra consulta',
}

export default defineEventHandler(async (event) => {
  await logInfo(event, 'contact/create', 'Contact form submission received')

  await checkRateLimit(event, 'contact/create', { limit: 3, windowSeconds: 3600 })

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)

  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid request body',
    })
  }

  const { intent, name, email, message, activityId, activityTitle, locale } = parsed.data

  try {
    const client = serverSupabaseServiceRole(event)
    const { error: dbError } = await client.from('contact_requests').insert({
      intent,
      name,
      email,
      message,
      activity_id: activityId ?? null,
      activity_title: activityTitle ?? null,
      locale,
      status: 'pending',
    })

    if (dbError) {
      await logError(event, 'contact/create', 'Failed to insert contact_request', {
        error: dbError.message,
        intent,
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to save contact request' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const safeActivityTitle = activityTitle ? escapeHtml(activityTitle) : ''
    const activityInfo = safeActivityTitle
      ? `<p><strong>Actividad:</strong> ${safeActivityTitle}${activityId ? ` (ID: ${escapeHtml(activityId)})` : ''}</p>`
      : ''

    await resend.emails.send({
      from: 'MundoPekes <onboarding@resend.dev>',
      to: process.env.CONTACT_NOTIFY_EMAIL!,
      subject: `[MundoPekes] Nueva consulta: ${INTENT_LABELS[intent]}`,
      html: `
        <h2>Nueva consulta desde MundoPekes</h2>
        <p><strong>Tipo:</strong> ${INTENT_LABELS[intent]}</p>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        ${activityInfo}
        <p><strong>Mensaje:</strong></p>
        <blockquote>${escapeHtml(message).replace(/\n/g, '<br>')}</blockquote>
        <hr>
        <small>Locale: ${escapeHtml(locale)}</small>
      `,
    })

    await logInfo(event, 'contact/create', 'Contact request processed', { intent, email })
    return { success: true }
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode) throw err
    await logError(event, 'contact/create', 'Unexpected error processing contact', {
      error: String(err),
      intent,
    })
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
