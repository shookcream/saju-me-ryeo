/** 생년월일로 만 나이를 계산합니다. */
export function getKoreanAge(dateString) {
  const today = new Date()
  const birth = new Date(dateString)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age -= 1
  }
  return age
}
