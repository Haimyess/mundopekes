export const NOT_FOUND_ERROR_CODES: readonly string[] = ['PGRST116', '22P02']

interface DatabaseError {
  code?: string
}

export const isNotFoundError = (error: DatabaseError | null | undefined): boolean =>
  !!error?.code && NOT_FOUND_ERROR_CODES.includes(error.code)

export const getRecordError = (entity: string, record: unknown, loadError: unknown) => {
  if (loadError) {
    return createError({
      statusCode: 503,
      statusMessage: `${entity} could not be loaded`,
      fatal: true,
    })
  }
  if (record === null || record === undefined) {
    return createError({ statusCode: 404, statusMessage: `${entity} not found` })
  }
  return null
}
