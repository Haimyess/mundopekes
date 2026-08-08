import Anthropic from '@anthropic-ai/sdk'
import { CATEGORIES_LIST } from '../config/categories.js'
import { AGE_RANGES } from '../config/age-ranges.js'

export interface EnrichInput {
  name_he: string
  formatted_address: string
  google_types: string[]
  opening_hours_text: string[]
  editorial_summary_he: string | null
  website_text: string | null
  has_price_signals: boolean
}

interface ScheduleDay {
  open: boolean
  start: string
  end: string
}

export interface ScheduleStructured {
  sunday: ScheduleDay
  monday: ScheduleDay
  tuesday: ScheduleDay
  wednesday: ScheduleDay
  thursday: ScheduleDay
  friday: ScheduleDay
  saturday: ScheduleDay
}

export interface EnrichedData {
  category_id: string
  age_range_ids: number[]
  best_season: string[]
  is_free: boolean
  is_free_confidence: 'high' | 'medium' | 'low'
  stroller_friendly: boolean
  open_weekends: boolean
  schedule_structured: ScheduleStructured
}

const SYSTEM_PROMPT = `You are a data enrichment specialist for MundoPekes, a family activity platform in Israel.
Your job is to analyze place data and return structured enrichment fields.
Return ONLY valid JSON. No markdown, no explanation, no preamble.

Israel context:
- Week: Sunday (יום א) is a workday, Saturday (שבת) is rest day
- Friday (יום ו) usually closes early (13:00-14:00)
- Summer (July-August) is very hot outdoors — mark outdoor activities accordingly
- Indoor activities are good for summer
- Seasons: spring=March-May, summer=June-August, autumn=September-November, winter=December-February

Rules for is_free:
- If website_text or opening_hours mention prices (₪, NIS, ticket, כרטיס, מחיר): is_free=false, confidence=high
- If has_price_signals=true: is_free=false, confidence=medium
- If google_types includes amusement_park, water_park, zoo, aquarium, museum: is_free=false, confidence=medium
  (unless scraping confirms otherwise)
- If google_types is park, playground, beach, natural_feature: is_free=true, confidence=high
- When uncertain: is_free=false, confidence=low

Rules for schedule_structured:
- Parse opening_hours_text carefully, it may be in Hebrew
- Default if no hours: Mon-Thu 09:00-17:00, Fri 09:00-14:00, Sat closed, Sun 09:00-17:00
- If "סגור" or "Closed" for a day: open=false

Rules for age_range_ids:
- Playgrounds, parks, beaches: all ages (ids of 0-12m, 1-3y, 3-6y, 6-12y)
- Museums, cultural: 3-6y and 6-12y typically
- Baby/toddler specific: 0-12m and 1-3y
- When uncertain: include 1-3y, 3-6y, 6-12y

Return this exact JSON structure:
{
  "category_id": "uuid from categories list",
  "age_range_ids": [1, 2, 3],
  "best_season": ["spring", "winter"],
  "is_free": false,
  "is_free_confidence": "medium",
  "stroller_friendly": true,
  "open_weekends": false,
  "schedule_structured": { ... }
}`

function buildUserMessage(input: EnrichInput): string {
  return JSON.stringify(
    {
      name_he: input.name_he,
      formatted_address: input.formatted_address,
      google_types: input.google_types,
      opening_hours_text: input.opening_hours_text.join(' | '),
      editorial_summary_he: input.editorial_summary_he,
      website_text: input.website_text ? input.website_text.slice(0, 3000) : null,
      has_price_signals: input.has_price_signals,
      categories: CATEGORIES_LIST,
      age_ranges: AGE_RANGES,
    },
    null,
    2
  )
}

function extractJson(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Haiku response did not contain a JSON object: ${text}`)
  }
  return text.slice(start, end + 1)
}

export async function enrichWithHaiku(input: EnrichInput): Promise<EnrichedData> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 800,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(input) }],
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Haiku response contained no text block')
  }

  let parsed: EnrichedData
  try {
    parsed = JSON.parse(extractJson(textBlock.text)) as EnrichedData
  } catch (err) {
    throw new Error(`Failed to parse Haiku JSON response: ${(err as Error).message}`, {
      cause: err,
    })
  }

  return parsed
}
