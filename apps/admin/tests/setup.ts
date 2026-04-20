import { getQuery, readBody, getRouterParam, createError } from 'h3'

// Nitro auto-imports not available in test environment
globalThis.defineEventHandler = (fn: (event: unknown) => unknown) => fn
globalThis.getQuery = getQuery
globalThis.readBody = readBody
globalThis.getRouterParam = getRouterParam
globalThis.createError = createError
