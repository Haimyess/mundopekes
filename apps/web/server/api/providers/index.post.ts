import { z } from 'zod'
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'
import { logError, logInfo } from '../../utils/logger'

const dayScheduleSchema = z.object({
  open: z.string().optional(),
  close: z.string().optional(),
  closed: z.boolean().optional(),
})

const bodySchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().min(50),
  activity_types: z.array(z.string()).min(1),
  address: z.string().optional(),
  city: z.string().optional(),
  schedule: z
    .object({
      sunday: dayScheduleSchema.optional(),
      monday: dayScheduleSchema.optional(),
      tuesday: dayScheduleSchema.optional(),
      wednesday: dayScheduleSchema.optional(),
      thursday: dayScheduleSchema.optional(),
      friday: dayScheduleSchema.optional(),
      saturday: dayScheduleSchema.optional(),
    })
    .optional(),
  price_range: z
    .object({
      from: z.number().optional(),
      to: z.number().optional(),
      currency: z.enum(['ILS', 'USD']).optional(),
    })
    .optional(),
})

export default defineEventHandler(async (event) => {
  await logInfo(event, 'providers/create', 'Provider registration request received')

  await checkRateLimit(event, 'providers/create', { limit: 2, windowSeconds: 3600 })

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid request body',
    })
  }

  const {
    name,
    email,
    phone,
    website,
    description,
    activity_types,
    address,
    city,
    schedule,
    price_range,
  } = parsed.data

  try {
    const client = serverSupabaseServiceRole(event)
    const { data: provider, error: dbError } = await client
      .from('providers')
      .insert({
        name,
        email,
        phone: phone ?? null,
        website: website || null,
        description,
        activity_types,
        address: address ?? null,
        city_id: null,
        schedule: schedule ?? {},
        price_range: price_range ?? {},
        metadata: { city: city ?? null },
        status: 'pending',
      })
      .select('id')
      .single()

    if (dbError) {
      await logError(event, 'providers/create', 'Failed to insert provider', {
        error: dbError.message,
      })
      throw createError({ statusCode: 500, statusMessage: 'Failed to save provider registration' })
    }

    const resend = new Resend(process.env.RESEND_API_KEY)
    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safePhone = phone ? escapeHtml(phone) : ''
    const safeWebsite = website ? escapeHtml(website) : ''
    const safeDescription = escapeHtml(description)
    const safeAddress = address ? escapeHtml(address) : ''
    const safeCity = city ? escapeHtml(city) : ''
    const typesHtml = activity_types.map((t) => `<li>${escapeHtml(t)}</li>`).join('')
    const safeTypesList = activity_types.map(escapeHtml).join(', ')

    await Promise.allSettled([
      resend.emails.send({
        from: 'MundoPekes <onboarding@resend.dev>',
        to: email,
        subject: '¡Recibimos tu solicitud! — MundoPekes',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">¡Hola, ${safeName}!</h1>
            <p>Hemos recibido tu solicitud para unirte a <strong>MundoPekes</strong> como proveedor de actividades familiares.</p>
            <h3>Resumen de tu solicitud:</h3>
            <ul>
              <li><strong>Negocio:</strong> ${safeName}</li>
              <li><strong>Email:</strong> ${safeEmail}</li>
              ${safePhone ? `<li><strong>Teléfono:</strong> ${safePhone}</li>` : ''}
              <li><strong>Descripción:</strong> ${safeDescription}</li>
            </ul>
            <h3>Tipos de actividades:</h3>
            <ul>${typesHtml}</ul>
            <p>Revisaremos tu solicitud en los próximos días y te contactaremos por email para continuar el proceso.</p>
            <p style="color: #6b7280; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
              <strong>MundoPekes</strong> — Actividades para familias en Israel
            </p>
          </div>
        `,
      }),
      resend.emails.send({
        from: 'MundoPekes <onboarding@resend.dev>',
        to: process.env.CONTACT_NOTIFY_EMAIL!,
        subject: `[MundoPekes] Nuevo proveedor: ${name}`,
        html: `
          <h2>Nueva solicitud de proveedor</h2>
          <p><strong>Nombre:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          ${safePhone ? `<p><strong>Teléfono:</strong> ${safePhone}</p>` : ''}
          ${safeWebsite ? `<p><strong>Web:</strong> ${safeWebsite}</p>` : ''}
          <p><strong>Descripción:</strong><br>${safeDescription}</p>
          <p><strong>Tipos:</strong> ${safeTypesList}</p>
          ${safeAddress ? `<p><strong>Dirección:</strong> ${safeAddress}</p>` : ''}
          ${safeCity ? `<p><strong>Ciudad:</strong> ${safeCity}</p>` : ''}
          ${price_range ? `<p><strong>Precios:</strong> ${price_range.from ?? '?'} - ${price_range.to ?? '?'} ${price_range.currency ?? 'ILS'}</p>` : ''}
          <hr>
          <p><a href="${process.env.ADMIN_URL ?? 'https://admin.mundopekes.com'}/providers">Ver en el admin</a></p>
        `,
      }),
    ])

    await logInfo(event, 'providers/create', 'Provider registration processed', {
      name,
      email,
      id: provider?.id,
    })
    return { success: true, id: provider?.id }
  } catch (err) {
    if ((err as { statusCode?: number }).statusCode) throw err
    await logError(event, 'providers/create', 'Unexpected error processing provider registration', {
      error: String(err),
    })
    throw createError({ statusCode: 500, statusMessage: 'Internal server error' })
  }
})
