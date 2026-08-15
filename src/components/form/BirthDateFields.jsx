import { useEffect, useRef, useState } from 'react'

const MIN_BIRTH_YEAR = 1920

function pad2(value) {
  return String(value).padStart(2, '0')
}

function daysInMonth(year, month) {
  if (!year || !month) return 31
  return new Date(Number(year), Number(month), 0).getDate()
}

function parseBirthDate(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return { year: '', month: '', day: '' }
  return { year: match[1], month: match[2], day: match[3] }
}

function buildBirthDate(year, month, day) {
  if (!year || !month || !day) return ''
  const maxDay = daysInMonth(year, month)
  const safeDay = Math.min(Number(day), maxDay)
  const next = `${year}-${pad2(month)}-${pad2(safeDay)}`
  const today = new Date().toISOString().slice(0, 10)
  return next > today ? today : next
}

function BirthDateFields({
  id = 'birthDate',
  value = '',
  onChange,
  disabled = false,
}) {
  const parsed = parseBirthDate(value)
  const [year, setYear] = useState(parsed.year)
  const [month, setMonth] = useState(parsed.month)
  const [day, setDay] = useState(parsed.day)
  const lastEmittedRef = useRef(value)

  useEffect(() => {
    if (value === lastEmittedRef.current) return
    lastEmittedRef.current = value
    const next = parseBirthDate(value)
    setYear(next.year)
    setMonth(next.month)
    setDay(next.day)
  }, [value])

  const maxYear = new Date().getFullYear()
  const yearOptions = []
  for (let y = maxYear; y >= MIN_BIRTH_YEAR; y -= 1) {
    yearOptions.push(y)
  }

  const maxDay = daysInMonth(year, month)
  const dayOptions = Array.from({ length: maxDay }, (_, index) => index + 1)

  function emit(nextYear, nextMonth, nextDay) {
    let safeDay = nextDay
    if (nextYear && nextMonth && nextDay) {
      const limit = daysInMonth(nextYear, nextMonth)
      if (Number(nextDay) > limit) {
        safeDay = pad2(limit)
      }
    }

    const nextValue = buildBirthDate(nextYear, nextMonth, safeDay)
    lastEmittedRef.current = nextValue

    if (nextValue) {
      const synced = parseBirthDate(nextValue)
      setYear(synced.year)
      setMonth(synced.month)
      setDay(synced.day)
    } else {
      setYear(nextYear)
      setMonth(nextMonth)
      setDay(safeDay)
    }

    onChange(nextValue)
  }

  return (
    <div className="birth-date-fields" role="group" aria-label="생년월일">
      <label className="birth-date-part">
        <span className="visually-hidden">연도</span>
        <select
          id={id}
          value={year}
          disabled={disabled}
          onChange={(event) => emit(event.target.value, month, day)}
          aria-label="출생 연도"
        >
          <option value="">년</option>
          {yearOptions.map((optionYear) => (
            <option key={optionYear} value={String(optionYear)}>
              {optionYear}년
            </option>
          ))}
        </select>
      </label>

      <label className="birth-date-part">
        <span className="visually-hidden">월</span>
        <select
          id={`${id}-month`}
          value={month}
          disabled={disabled}
          onChange={(event) => emit(year, event.target.value, day)}
          aria-label="출생 월"
        >
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, index) => {
            const optionMonth = pad2(index + 1)
            return (
              <option key={optionMonth} value={optionMonth}>
                {index + 1}월
              </option>
            )
          })}
        </select>
      </label>

      <label className="birth-date-part">
        <span className="visually-hidden">일</span>
        <select
          id={`${id}-day`}
          value={day && Number(day) <= maxDay ? day : ''}
          disabled={disabled}
          onChange={(event) => emit(year, month, event.target.value)}
          aria-label="출생 일"
        >
          <option value="">일</option>
          {dayOptions.map((optionDay) => {
            const valueDay = pad2(optionDay)
            return (
              <option key={valueDay} value={valueDay}>
                {optionDay}일
              </option>
            )
          })}
        </select>
      </label>
    </div>
  )
}

export default BirthDateFields
