import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

import { DISCOVERY_QUERIES } from './config/queries.js'
import { CATEGORIES_LIST } from './config/categories.js'
import { loadAgeRanges } from './config/age-ranges.js'

import { discover } from './steps/1-discover.js'
import { loadExistingPlaceIds, deduplicateByGooglePlaceId } from './steps/2-deduplicate.js'
import { fetchDetails } from './steps/3-details.js'
import { scrapeWebsite, detectsPricingInText } from './steps/4-scrape.js'
import { enrichWithHaiku } from './steps/5-enrich.js'
import { extractCity, ingestSuggestion } from './steps/6-ingest.js'
import { logSuggestionReceived } from './utils/app-logger.js'

import { sendRunReport } from './reporting/email.js'
import { updateConfluenceReports } from './reporting/confluence.js'

import { logInfo, logWarn, logError, logSuccess } from './utils/logger.js'
import { sleep } from './utils/sleep.js'
import { retry } from './utils/retry.js'

import type { RunReport, InsertedPlaceDetail } from './types.js'

const MAX_INSERTS_PER_RUN = 50
const SLEEP_BETWEEN_PLACES_MS = 2000
const SLEEP_BETWEEN_QUERIES_MS = 4000

const REQUIRED_ENV_VARS = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'GOOGLE_PLACES_API_KEY',
  'ANTHROPIC_API_KEY',
]

function validateEnv(): void {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run')

  validateEnv()

  const supabase = createClient(
    process.env.SUPABASE_URL as string,
    process.env.SUPABASE_SERVICE_KEY as string
  )

  await loadAgeRanges(supabase)

  const existingPlaceIds = await loadExistingPlaceIds(supabase)
  logInfo(`Loaded ${existingPlaceIds.size} existing google_place_ids`)

  const report: RunReport = {
    runDate: new Date().toISOString().slice(0, 10),
    queriesRun: 0,
    placesFound: 0,
    alreadyExisted: 0,
    inserted: 0,
    skippedPaid: 0,
    errors: 0,
    insertedPlaces: [],
  }
  const insertedDetails: InsertedPlaceDetail[] = []

  queryLoop: for (const query of DISCOVERY_QUERIES) {
    logInfo(`[QUERY] "${query}"`)
    report.queriesRun++

    const discovered = await discover(query)
    report.placesFound += discovered.length

    const newPlaces = deduplicateByGooglePlaceId(discovered, existingPlaceIds)
    report.alreadyExisted += discovered.length - newPlaces.length

    if (newPlaces.length === 0) {
      logInfo('Ya existen todos los lugares de esta query')
      await sleep(SLEEP_BETWEEN_QUERIES_MS)
      continue
    }

    for (const place of newPlaces) {
      try {
        const details = await retry(() => fetchDetails(place.place_id), 3, 1000)
        const websiteText = await scrapeWebsite(details.website)
        const hasPriceSignals = detectsPricingInText(websiteText ?? '')

        const enriched = await retry(
          () =>
            enrichWithHaiku({
              name_he: details.name_i18n.he,
              formatted_address: place.formatted_address,
              google_types: place.types,
              opening_hours_text: details.opening_hours_text,
              editorial_summary_he: details.description_he,
              website_text: websiteText,
              has_price_signals: hasPriceSignals,
            }),
          2,
          2000
        )

        if (enriched.is_free === false && enriched.is_free_confidence === 'high') {
          logInfo(`Skipped (paid, high confidence): ${details.name_i18n.he}`)
          report.skippedPaid++
          await sleep(SLEEP_BETWEEN_PLACES_MS)
          continue
        }

        const categoryName =
          CATEGORIES_LIST.find((c) => c.id === enriched.category_id)?.name ?? enriched.category_id
        const city = extractCity(place.formatted_address)

        if (dryRun) {
          logInfo('[DRY RUN] Would insert suggestion', {
            place,
            details,
            enriched,
          } as unknown as Record<string, unknown>)
          report.inserted++
        } else {
          const { id } = await ingestSuggestion(place, details, enriched, supabase)
          logSuccess(`Inserted suggestion ${id}: ${details.name_i18n.he}`)
          await logSuggestionReceived(supabase, {
            suggestionId: id,
            name: details.name_i18n.he,
            city,
            category: categoryName,
          })
          report.inserted++
          existingPlaceIds.add(place.place_id)
        }

        report.insertedPlaces.push({
          name_he: details.name_i18n.he,
          city,
          category: categoryName,
          is_free: enriched.is_free,
        })
        insertedDetails.push({
          name_he: details.name_i18n.he,
          name_es: details.name_i18n.es,
          city,
          category: categoryName,
          is_free: enriched.is_free,
          is_free_confidence: enriched.is_free_confidence,
          website: details.website,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        logError(`Failed to process place ${place.place_id} (${place.name})`, {
          error: String(err),
        })
        report.errors++
      }

      await sleep(SLEEP_BETWEEN_PLACES_MS)

      if (report.inserted >= MAX_INSERTS_PER_RUN) {
        logWarn(`Reached max inserts per run (${MAX_INSERTS_PER_RUN}) — stopping`)
        break queryLoop
      }
    }

    await sleep(SLEEP_BETWEEN_QUERIES_MS)
  }

  logInfo('Run summary', report as unknown as Record<string, unknown>)

  if (!dryRun) {
    await sendRunReport(report)
    if (report.inserted > 0) {
      await updateConfluenceReports(report, insertedDetails, supabase)
    }
  }

  // Per-place errors are already caught and counted individually above — they don't
  // abort the run. A non-zero exit only happens via the top-level catch below.
  process.exit(0)
}

main().catch((err) => {
  logError('Fatal error in catalog agent', { error: String(err) })
  process.exit(1)
})
