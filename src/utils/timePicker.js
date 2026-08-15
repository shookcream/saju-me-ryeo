/** 시·분이 모두 채워지면 time 선택 창을 닫습니다. */
export function closeTimePickerIfComplete(event) {
  const value = event.target.value
  if (/^\d{2}:\d{2}/.test(value)) {
    event.target.blur()
  }
}
