export const VALIDATION_ERRORS = {
  required: 'validation.required',
  tooShort: 'validation.tooShort',
  tooLong: 'validation.tooLong',
  invalidEmail: 'validation.invalidEmail',
  invalidUrl: 'validation.invalidUrl',
  invalidOption: 'validation.invalidOption',
  selectAtLeastOne: 'validation.selectAtLeastOne',
  invalidNumber: 'validation.invalidNumber',
  payloadTooLarge: 'validation.payloadTooLarge',
} as const

export type ValidationErrorKey = (typeof VALIDATION_ERRORS)[keyof typeof VALIDATION_ERRORS]
