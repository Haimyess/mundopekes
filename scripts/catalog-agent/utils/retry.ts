import { sleep } from './sleep.js'
import { logWarn } from './logger.js'

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  delayMs: number
): Promise<T> {
  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt < maxAttempts) {
        logWarn(
          `Attempt ${attempt}/${maxAttempts} failed: ${(err as Error).message} — retrying in ${delayMs}ms`
        )
        await sleep(delayMs)
      }
    }
  }

  throw lastError
}
