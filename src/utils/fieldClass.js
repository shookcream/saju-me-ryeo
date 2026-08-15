export function fieldClass(value, showFieldErrors) {
  return `field${showFieldErrors && !value ? ' is-invalid' : ''}`
}
