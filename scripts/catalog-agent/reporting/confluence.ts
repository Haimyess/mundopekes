import type { SupabaseClient } from '@supabase/supabase-js'
import type { RunReport, InsertedPlaceDetail } from '../types.js'
import { logError, logInfo } from '../utils/logger.js'

function authHeader(): string {
  const email = process.env.CONFLUENCE_EMAIL as string
  const token = process.env.CONFLUENCE_API_TOKEN as string
  return `Basic ${Buffer.from(`${email}:${token}`).toString('base64')}`
}

function confluenceFetch(path: string, init?: RequestInit): Promise<Response> {
  const base = (process.env.CONFLUENCE_BASE_URL as string).replace(/\/$/, '')
  return fetch(`${base}/wiki/api/v2/${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
}

function escapeXhtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function buildReportPageHTML(report: RunReport, inserted: InsertedPlaceDetail[]): string {
  const lowConfidence = inserted.filter((p) => p.is_free_confidence === 'low').length

  const rows = inserted
    .map(
      (p) => `<tr>
        <td>${escapeXhtml(p.name_he)}</td>
        <td>${escapeXhtml(p.name_es)}</td>
        <td>${escapeXhtml(p.city)}</td>
        <td>${escapeXhtml(p.category)}</td>
        <td>${p.is_free ? 'Sí' : 'No'}</td>
        <td>${p.is_free_confidence}</td>
        <td>${p.website ? escapeXhtml(p.website) : '-'}</td>
      </tr>`
    )
    .join('')

  return `
    <h2>Resumen de la ejecución</h2>
    <table>
      <tbody>
        <tr><th>Queries corridas</th><td>${report.queriesRun}</td></tr>
        <tr><th>Lugares encontrados</th><td>${report.placesFound}</td></tr>
        <tr><th>Ya existentes</th><td>${report.alreadyExisted}</td></tr>
        <tr><th>Insertados</th><td>${report.inserted}</td></tr>
        <tr><th>Omitidos (pagos)</th><td>${report.skippedPaid}</td></tr>
        <tr><th>Errores</th><td>${report.errors}</td></tr>
      </tbody>
    </table>
    <h2>Lugares insertados</h2>
    <table>
      <thead>
        <tr><th>Nombre HE</th><th>Nombre ES</th><th>Ciudad</th><th>Categoría</th><th>Gratis</th><th>Confianza</th><th>Web</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p><strong>${lowConfidence}</strong> lugares con is_free_confidence=low requieren verificación manual.</p>
  `
}

function buildCatalogPageHTML(
  allPlaces: Array<{
    name_he: string
    name_es: string
    city: string
    category: string
    is_free: boolean
    confidence: string
    status: string
    created_at: string
    website: string | null
  }>
): string {
  const rows = allPlaces
    .map(
      (p, i) => `<tr>
        <td>${i + 1}</td>
        <td>${escapeXhtml(p.name_he)}</td>
        <td>${escapeXhtml(p.name_es)}</td>
        <td>${escapeXhtml(p.city)}</td>
        <td>${escapeXhtml(p.category)}</td>
        <td>${p.is_free ? 'Sí' : 'No'}</td>
        <td>${p.confidence}</td>
        <td>${p.status}</td>
        <td>${p.created_at}</td>
        <td>${p.website ? escapeXhtml(p.website) : '-'}</td>
      </tr>`
    )
    .join('')

  return `
    <h2>Catálogo MundoPekes — Todas las actividades del agente</h2>
    <table>
      <thead>
        <tr><th>#</th><th>Nombre HE</th><th>Nombre ES</th><th>Ciudad</th><th>Categoría</th><th>Gratis</th><th>Confianza</th><th>Status</th><th>Fecha</th><th>Web</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `
}

async function createReportPage(report: RunReport, inserted: InsertedPlaceDetail[]): Promise<void> {
  const spaceKey = process.env.CONFLUENCE_SPACE_KEY as string
  const parentId = process.env.CONFLUENCE_REPORTS_PARENT_PAGE_ID as string

  const spacesRes = await confluenceFetch(`spaces?keys=${encodeURIComponent(spaceKey)}`)
  if (!spacesRes.ok) throw new Error(`Failed to resolve space id: ${spacesRes.status}`)
  const spacesBody = (await spacesRes.json()) as { results?: Array<{ id: string }> }
  const spaceId = spacesBody.results?.[0]?.id
  if (!spaceId) throw new Error(`Confluence space "${spaceKey}" not found`)

  const res = await confluenceFetch('pages', {
    method: 'POST',
    body: JSON.stringify({
      spaceId,
      parentId,
      title: `Reporte Agente ${report.runDate}`,
      status: 'current',
      body: {
        representation: 'storage',
        value: buildReportPageHTML(report, inserted),
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to create Confluence report page: ${res.status} ${await res.text()}`)
  }
}

async function updateCatalogPage(supabase: SupabaseClient): Promise<void> {
  const pageId = process.env.CONFLUENCE_CATALOG_PAGE_ID as string

  const pageRes = await confluenceFetch(`pages/${pageId}`)
  if (!pageRes.ok) throw new Error(`Failed to fetch catalog page: ${pageRes.status}`)
  const page = (await pageRes.json()) as { version: { number: number } }

  const { data, error } = await supabase
    .from('suggestions')
    .select('id, name_i18n, location, category_id, is_free, status, created_at, metadata')
    .eq('metadata->>source', 'agent')
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to load agent suggestions for catalog page: ${error.message}`)

  type Row = {
    name_i18n: Record<string, string> | null
    location: { city?: string } | null
    category_id: string | null
    is_free: boolean | null
    status: string
    created_at: string
    metadata: {
      is_free_confidence?: string
      website?: string | null
    } | null
  }

  const allPlaces = ((data ?? []) as Row[]).map((row) => ({
    name_he: row.name_i18n?.he ?? '',
    name_es: row.name_i18n?.es ?? '',
    city: row.location?.city ?? '',
    category: row.category_id ?? '',
    is_free: row.is_free ?? false,
    confidence: row.metadata?.is_free_confidence ?? 'low',
    status: row.status,
    created_at: row.created_at,
    website: row.metadata?.website ?? null,
  }))

  const res = await confluenceFetch(`pages/${pageId}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: pageId,
      status: 'current',
      title: 'Catálogo MundoPekes — Todas las actividades del agente',
      version: { number: page.version.number + 1 },
      body: {
        representation: 'storage',
        value: buildCatalogPageHTML(allPlaces),
      },
    }),
  })

  if (!res.ok) {
    throw new Error(`Failed to update Confluence catalog page: ${res.status} ${await res.text()}`)
  }
}

export async function updateConfluenceReports(
  report: RunReport,
  insertedDetails: InsertedPlaceDetail[],
  supabase: SupabaseClient
): Promise<void> {
  if (!process.env.CONFLUENCE_BASE_URL || !process.env.CONFLUENCE_API_TOKEN) {
    logError('Confluence env vars not set — skipping Confluence report')
    return
  }

  try {
    await createReportPage(report, insertedDetails)
    logInfo('Confluence weekly report page created')
  } catch (err) {
    logError('Failed to create Confluence report page', { error: String(err) })
  }

  try {
    await updateCatalogPage(supabase)
    logInfo('Confluence catalog master page updated')
  } catch (err) {
    logError('Failed to update Confluence catalog page', { error: String(err) })
  }
}
