const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/

export function isValidHandle(value: string) {
  return HANDLE_PATTERN.test(value.trim().toLocaleLowerCase("en-US"))
}

export function isValidDisplayName(value: string) {
  const length = value.trim().length
  return length >= 2 && length <= 80
}
