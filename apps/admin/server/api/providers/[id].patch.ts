import { z } from 'zod'
import { Resend } from 'resend'
import { serverSupabaseServiceRole } from '#supabase/server'
import type { Database } from '~/types/database.types'

const bodySchema = z.object({
  status: z.enum(['active', 'suspended', 'rejected']),
  notes: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const supabase = serverSupabaseServiceRole<Database>(event)
  const id = getRouterParam(event, 'id')

  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing provider id' })

  const raw = await readBody(event)
  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: parsed.error.issues[0]?.message ?? 'Invalid body',
    })
  }

  const { status, notes } = parsed.data

  const { data: existing } = await supabase
    .from('providers')
    .select('name, email')
    .eq('id', id)
    .single()

  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Provider not found' })

  const { data, error } = await supabase
    .from('providers')
    .update({ status, notes: notes ?? null })
    .eq('id', id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (process.env.RESEND_API_KEY && (status === 'active' || status === 'rejected')) {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const subject =
      status === 'active'
        ? '¡Tu solicitud fue aprobada! — MundoPekes'
        : 'Actualización sobre tu solicitud — MundoPekes'
    const html =
      status === 'active'
        ? `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #16a34a;">¡Bienvenido a MundoPekes, ${existing.name}!</h1>
          <p>Nos complace informarte que tu solicitud para unirte como proveedor ha sido <strong>aprobada</strong>.</p>
          <p>En los próximos días te contactaremos para darte acceso a tu perfil y ayudarte a configurar tu presencia en MundoPekes.</p>
          <p style="color: #6b7280; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <strong>MundoPekes</strong> — Actividades para familias en Israel
          </p>
        </div>
      `
        : `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #374151;">Hola, ${existing.name}</h1>
          <p>Hemos revisado tu solicitud para unirte a MundoPekes como proveedor y en este momento no podemos aprobarla.</p>
          ${notes ? `<p><strong>Motivo:</strong> ${notes}</p>` : ''}
          <p>No te desanimes — puedes volver a aplicar en el futuro con información actualizada. Estaremos encantados de revisarla.</p>
          <p>Si tienes preguntas, no dudes en contactarnos respondiendo a este email.</p>
          <p style="color: #6b7280; font-size: 0.875rem; margin-top: 2rem; border-top: 1px solid #e5e7eb; padding-top: 1rem;">
            <strong>MundoPekes</strong> — Actividades para familias en Israel
          </p>
        </div>
      `
    await resend.emails.send({
      from: 'MundoPekes <onboarding@resend.dev>',
      to: existing.email,
      subject,
      html,
    })
  }

  return data
})
