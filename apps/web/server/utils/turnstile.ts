import type { H3Event } from 'h3'

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
const VERIFY_TIMEOUT_MS = 5000

interface SiteverifyResponse {
  success: boolean
  'error-codes'?: string[]
}

export async function verifyTurnstileToken(event: H3Event, token: string): Promise<boolean> {
  const secret = useRuntimeConfig(event).turnstileSecretKey as string | undefined
  if (!secret) {
    await logError(event, 'turnstile', 'Turnstile secret key is not configured', {})
    throw createError({ statusCode: 503, statusMessage: 'Verification unavailable' })
  }
  const body = new URLSearchParams({ secret, response: token })
  const remoteIp = getRequestIP(event, { xForwardedFor: true })
  if (remoteIp) body.set('remoteip', remoteIp)
  try {
    const result = await $fetch<SiteverifyResponse>(SITEVERIFY_URL, {
      method: 'POST',
      body,
      timeout: VERIFY_TIMEOUT_MS,
    })
    return result.success === true
  } catch (error) {
    await logError(event, 'turnstile', 'Turnstile verification failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}
