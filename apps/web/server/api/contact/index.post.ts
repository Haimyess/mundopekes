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

// In-memory rate limiter: max 3 requests per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 3
const RATE_WINDOW_MS = 60 * 60 * 1000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT) return false

  entry.count++
  return true
}

const INTENT_LABELS: Record<ContactIntent, string> = {
  outdated_activity: '🐛 Información desactualizada',
  feedback: '💬 Feedback sobre la web',
  provider_inquiry: '🏢 Soy proveedor',
  other: '💡 Otra consulta',
}

export default defineEventHandler(async (event) => {
  await logInfo(event, 'contact/create', 'Contact form submission received')

  const ip = getRequestHeader(event, 'x-forwarded-for') ?? getRequestIP(event) ?? 'unknown'

  if (!checkRateLimit(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests. Try again later.' })
  }

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
    const activityInfo = activityTitle
      ? `<p><strong>Actividad:</strong> ${activityTitle}${activityId ? ` (ID: ${activityId})` : ''}</p>`
      : ''

    await resend.emails.send({
      from: 'MundoPekes <onboarding@resend.dev>',
      to: process.env.CONTACT_NOTIFY_EMAIL!,
      subject: `[MundoPekes] Nueva consulta: ${INTENT_LABELS[intent]}`,
      html: `
        <h2>Nueva consulta desde MundoPekes</h2>
        <p><strong>Tipo:</strong> ${INTENT_LABELS[intent]}</p>
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${activityInfo}
        <p><strong>Mensaje:</strong></p>
        <blockquote>${message.replace(/\n/g, '<br>')}</blockquote>
        <hr>
        <small>Locale: ${locale}</small>
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
