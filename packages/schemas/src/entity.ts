import { z } from 'zod'

export const entityIdSchema = z.uuid()

export type EntityId = z.output<typeof entityIdSchema>
