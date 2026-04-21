import { serverSupabaseServiceRole } from '#supabase/server'
import type { H3Event } from 'h3'

type LogLevel = 'error' | 'warn' | 'info'
type LogMetadata = Record<string, unknown>

export async function log(
  event: H3Event,
  level: LogLevel,
  context: string,
  message: string,
  metadata?: LogMetadata
): Promise<void> {
  if (level === 'error') {
    console.error(`[${context}] ${message}`, metadata ?? '')
  }

  try {
    const client = serverSupabaseServiceRole(event)
    await client.from('app_logs').insert({
      level,
      context,
      message,
      metadata: metadata ?? {},
      app: 'web',
    })
  } catch (err) {
    console.error('[logger] Failed to write to app_logs:', err)
  }
}

export const logError = (
  event: H3Event,
  context: string,
  message: string,
  metadata?: LogMetadata
) => log(event, 'error', context, message, metadata)

export const logWarn = (event: H3Event, context: string, message: string, metadata?: LogMetadata) =>
  log(event, 'warn', context, message, metadata)

export const logInfo = (event: H3Event, context: string, message: string, metadata?: LogMetadata) =>
  log(event, 'info', context, message, metadata)
