import { describe, expect, it } from 'vitest'
import {
  attractionSchema,
  breadcrumbSchema,
  openingHoursSchema,
  serializeJsonLd,
  websiteSchema,
} from '~/app/utils/structured-data'

const BASE = {
  name: 'Parque Yarkon',
  url: 'https://mundopekes.com/place/p1',
  description: 'Un parque enorme',
  images: ['/api/places/photo?ref=1', 'https://cdn.test/yarkon.jpg'],
  cityName: 'Tel Aviv',
  address: 'Rokach 1',
  location: { lat: 32.1, lng: 34.8 },
  telephone: '+972 3 123 4567',
  isFree: true,
  hours: { 0: [{ start: 480, end: 1080 }], 5: [{ start: 1200, end: 1500 }] },
}

describe('serializeJsonLd', () => {
  it('cannot close the script tag from content', () => {
    const json = serializeJsonLd({ name: '</script><script>alert(1)</script>' })
    expect(json).not.toContain('</script>')
    expect(JSON.parse(json).name).toBe('</script><script>alert(1)</script>')
  })
})

describe('websiteSchema', () => {
  it('describes the site search for search engines', () => {
    const schema = websiteSchema('MundoPekes', 'https://m.co/en', 'https://m.co/en/search')
    const site = (schema['@graph'] as Record<string, unknown>[])[1]!
    expect(site).toMatchObject({
      '@type': 'WebSite',
      potentialAction: {
        target: { urlTemplate: 'https://m.co/en/search?q={search_term_string}' },
      },
    })
  })
})

describe('openingHoursSchema', () => {
  it('maps weekdays and caps overnight closing at the end of the day', () => {
    expect(openingHoursSchema(BASE.hours)).toEqual([
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Sunday',
        opens: '08:00',
        closes: '18:00',
      },
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: 'Friday',
        opens: '20:00',
        closes: '23:59',
      },
    ])
    expect(openingHoursSchema(null)).toEqual([])
  })
})

describe('attractionSchema', () => {
  it('builds a tourist attraction with address, geo and public images only', () => {
    expect(attractionSchema(BASE)).toMatchObject({
      '@type': 'TouristAttraction',
      image: ['https://cdn.test/yarkon.jpg'],
      isAccessibleForFree: true,
      address: { addressLocality: 'Tel Aviv', streetAddress: 'Rokach 1', addressCountry: 'IL' },
      geo: { latitude: 32.1, longitude: 34.8 },
    })
  })

  it('drops empty data and links the venue of an activity', () => {
    const schema = attractionSchema({
      ...BASE,
      description: null,
      images: [],
      cityName: null,
      location: null,
      telephone: null,
      hours: null,
      venue: { name: 'Museo', url: 'https://m.co/place/v1' },
    })
    expect(Object.keys(schema)).not.toEqual(
      expect.arrayContaining(['description', 'image', 'address', 'geo', 'telephone'])
    )
    expect(schema.containedInPlace).toEqual({
      '@type': 'Place',
      name: 'Museo',
      url: 'https://m.co/place/v1',
    })
  })
})

describe('breadcrumbSchema', () => {
  it('numbers the trail from one', () => {
    const schema = breadcrumbSchema([
      { name: 'Inicio', url: 'https://m.co/' },
      { name: 'Parque', url: 'https://m.co/place/p1' },
    ])
    expect(schema.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://m.co/' },
      { '@type': 'ListItem', position: 2, name: 'Parque', item: 'https://m.co/place/p1' },
    ])
  })
})
