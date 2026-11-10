import type { GeoPoint } from '@mundopekes/core'
import type { DetailContact } from '#shared/types/detail'

const ISRAEL_COUNTRY_CODE = '972'
const ISRAELI_MOBILE_PATTERN = /^05\d{8}$/
const NON_DIGITS = /\D/g
const SAFE_URL_PROTOCOLS = new Set(['http:', 'https:'])

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export function safeWebsite(value: unknown): string | null {
  const raw = text(value)
  if (!raw) return null
  try {
    const url = new URL(raw)
    return SAFE_URL_PROTOCOLS.has(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}

export function whatsappUrl(phone: string | null): string | null {
  const digits = phone?.replace(NON_DIGITS, '') ?? ''
  if (!ISRAELI_MOBILE_PATTERN.test(digits)) return null
  return `https://wa.me/${ISRAEL_COUNTRY_CODE}${digits.slice(1)}`
}

export function buildContact(
  metadata: Record<string, unknown> | null | undefined,
  location: GeoPoint | null
): DetailContact {
  const phone = text(metadata?.phone)
  const coordinates = location ? `${location.lat},${location.lng}` : null
  return {
    phone,
    website: safeWebsite(metadata?.website),
    whatsappUrl: whatsappUrl(phone),
    directionsUrl: coordinates
      ? `https://www.google.com/maps/dir/?api=1&destination=${coordinates}`
      : safeWebsite(metadata?.google_url),
    wazeUrl: coordinates ? `https://waze.com/ul?ll=${coordinates}&navigate=yes` : null,
  }
}

export function metadataText(metadata: Record<string, unknown> | null | undefined, key: string) {
  return text(metadata?.[key])
}
