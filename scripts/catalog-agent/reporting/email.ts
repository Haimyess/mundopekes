import type { RunReport } from '../types.js'
import { logError, logInfo } from '../utils/logger.js'

function buildHtml(report: RunReport): string {
  const rows = report.insertedPlaces
    .map(
      (p) =>
        `<tr><td>${p.name_he}</td><td>${p.city}</td><td>${p.category}</td><td>${p.is_free ? 'Sí' : 'No'}</td></tr>`
    )
    .join('')

  return `
    <h2>MundoPekes Catalog Agent — Reporte de ejecución</h2>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><td>Fecha</td><td>${report.runDate}</td></tr>
      <tr><td>Queries ejecutadas</td><td>${report.queriesRun}</td></tr>
      <tr><td>Lugares encontrados</td><td>${report.placesFound}</td></tr>
      <tr><td>Ya existían</td><td>${report.alreadyExisted}</td></tr>
      <tr><td>Insertados</td><td>${report.inserted}</td></tr>
      <tr><td>Omitidos (pagos, alta confianza)</td><td>${report.skippedPaid}</td></tr>
      <tr><td>Errores</td><td>${report.errors}</td></tr>
    </table>
    <h3>Actividades insertadas</h3>
    <table border="1" cellpadding="6" cellspacing="0">
      <tr><th>Nombre (HE)</th><th>Ciudad</th><th>Categoría</th><th>Gratis</th></tr>
      ${rows || '<tr><td colspan="4">Ninguna</td></tr>'}
    </table>
    <p>Este email fue generado automáticamente por el Catalog Agent de MundoPekes.</p>
  `
}

export async function sendRunReport(report: RunReport): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM

  if (!apiKey || !from) {
    logError('RESEND_API_KEY or RESEND_FROM not set — skipping email report')
    return
  }

  const subject =
    report.inserted > 0
      ? `🔍 MundoPekes Agent — ${report.inserted} actividades nuevas agregadas (${report.runDate})`
      : `⚠️ MundoPekes Agent — sin actividades nuevas esta semana`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: 'haimyess@gmail.com',
        subject,
        html: buildHtml(report),
      }),
    })

    if (!res.ok) {
      logError('Resend API returned an error', { status: res.status, body: await res.text() })
      return
    }

    logInfo('Run report email sent')
  } catch (err) {
    logError('Failed to send run report email', { error: String(err) })
  }
}
