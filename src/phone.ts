import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js'

export function isValidPhoneNumber(value: string, defaultCountry: CountryCode = 'CU') {
  const parsed = parsePhoneNumberFromString(value, defaultCountry)
  return Boolean(parsed?.isValid())
}

export function normalizePhoneNumber(value: string, defaultCountry: CountryCode = 'CU') {
  const parsed = parsePhoneNumberFromString(value, defaultCountry)
  return parsed?.number || value.replace(/\D/g, '')
}
