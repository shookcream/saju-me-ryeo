export function formatBirthTime(value) {
  if (!value) return ''
  return String(value).slice(0, 5)
}

export function normalizeResultText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\\n/g, '\n')
}

export function formatDisplayDate(dateString) {
  if (!dateString) return ''
  const [year, month, day] = String(dateString).split('-')
  if (!year || !month || !day) return dateString
  return `${year}.${month}.${day}`
}

export function formatDisplayDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}.${month}.${day} ${hour}:${minute}`
}

export const SHARE_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getShareUrl(readingId) {
  return `${window.location.origin}/result/${readingId}`
}

export async function shareReading({ id, name }) {
  const url = getShareUrl(id)
  const title = `${name || '사주'}님의 사주 | 사주미麗`
  const text = `${name || '친구'}님의 사주 해석을 확인해 보세요.`

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (error) {
      if (error.name === 'AbortError') return 'cancelled'
    }
  }

  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'failed'
  }
}
