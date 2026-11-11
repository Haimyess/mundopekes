import { formatMinutes, MINUTES_PER_DAY, type GeoPoint, type WeeklyHours } from '@mundopekes/core'

type JsonLd = Record<string, unknown>

const SCHEMA_CONTEXT = 'https://schema.org'
const COUNTRY_CODE = 'IL'
const SCHEMA_DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export interface BreadcrumbItem {
  name: string
  url: string
}

export interface AttractionInput {
  name: string
  url: string
  description: string | null
  images: readonly string[]
  cityName: string | null
  address: string | null
  location: GeoPoint | null
  telephone: string | null
  isFree: boolean
  hours: WeeklyHours | null
  venue?: { name: string; url: string } | null
}

function compact(record: JsonLd): JsonLd {
  return Object.fromEntries(
    Object.entries(record).filter(
      ([, value]) =>
        value !== null && value !== undefined && !(Array.isArray(value) && !value.length)
    )
  )
}

export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function websiteSchema(siteName: string, homeUrl: string, searchUrl: string): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@graph': [
      { '@type': 'Organization', name: siteName, url: homeUrl },
      {
        '@type': 'WebSite',
        name: siteName,
        url: homeUrl,
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${searchUrl}?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

export function openingHoursSchema(hours: WeeklyHours | null): JsonLd[] {
  if (!hours) return []
  return SCHEMA_DAYS.flatMap((dayOfWeek, weekday) =>
    (hours[weekday as keyof WeeklyHours] ?? []).map(({ start, end }) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek,
      opens: formatMinutes(start),
      closes: formatMinutes(Math.min(end, MINUTES_PER_DAY)),
    }))
  )
}

export function attractionSchema(input: AttractionInput): JsonLd {
  return compact({
    '@context': SCHEMA_CONTEXT,
    '@type': 'TouristAttraction',
    name: input.name,
    url: input.url,
    description: input.description,
    image: input.images.filter((src) => src.startsWith('https://')),
    telephone: input.telephone,
    isAccessibleForFree: input.isFree,
    touristType: 'Families with children',
    address: input.cityName
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: input.address,
          addressLocality: input.cityName,
          addressCountry: COUNTRY_CODE,
        })
      : null,
    geo: input.location
      ? { '@type': 'GeoCoordinates', latitude: input.location.lat, longitude: input.location.lng }
      : null,
    openingHoursSpecification: openingHoursSchema(input.hours),
    containedInPlace: input.venue
      ? { '@type': 'Place', name: input.venue.name, url: input.venue.url }
      : null,
  })
}

export function breadcrumbSchema(items: readonly BreadcrumbItem[]): JsonLd {
  return {
    '@context': SCHEMA_CONTEXT,
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}
