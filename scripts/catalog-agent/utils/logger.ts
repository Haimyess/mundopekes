const COLORS = {
  reset: '\x1B[0m',
  gray: '\x1B[90m',
  blue: '\x1B[34m',
  green: '\x1B[32m',
  yellow: '\x1B[33m',
  red: '\x1B[31m',
}

function timestamp(): string {
  return new Date().toISOString()
}

export function logInfo(message: string, data?: Record<string, unknown>): void {
  console.log(
    `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.blue}[INFO]${COLORS.reset} ${message}`,
    data ?? ''
  )
}

export function logSuccess(message: string, data?: Record<string, unknown>): void {
  console.log(
    `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.green}[OK]${COLORS.reset} ${message}`,
    data ?? ''
  )
}

export function logWarn(message: string, data?: Record<string, unknown>): void {
  console.warn(
    `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}[WARN]${COLORS.reset} ${message}`,
    data ?? ''
  )
}

export function logError(message: string, data?: Record<string, unknown>): void {
  console.error(
    `${COLORS.gray}[${timestamp()}]${COLORS.reset} ${COLORS.red}[ERROR]${COLORS.reset} ${message}`,
    data ?? ''
  )
}
