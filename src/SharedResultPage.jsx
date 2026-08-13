import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import SajuResultCard from './SajuResultCard'
import {
  SHARE_ID_PATTERN,
  normalizeResultText,
  shareReading,
} from './sajuFormat'
import './App.css'

function SharedResultPage({ shareId }) {
  const [reading, setReading] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [statusMessage, setStatusMessage] = useState('')
  const [toastLeaving, setToastLeaving] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadSharedReading() {
      if (!SHARE_ID_PATTERN.test(shareId || '')) {
        setErrorMessage('올바르지 않은 공유 링크입니다.')
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase.rpc('get_shared_saju_reading', {
        share_id: shareId,
      })

      if (cancelled) return

      if (error) {
        setErrorMessage(`사주 결과를 불러오지 못했습니다: ${error.message}`)
        setIsLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row) {
        setErrorMessage('이 사주 결과를 찾을 수 없습니다. 링크가 잘못되었거나 삭제된 기록입니다.')
        setIsLoading(false)
        return
      }

      setReading({
        ...row,
        result: normalizeResultText(row.result),
      })
      setIsLoading(false)
    }

    loadSharedReading()
    return () => {
      cancelled = true
    }
  }, [shareId])

  useEffect(() => {
    const previousTitle = document.title
    const robots = document.querySelector('meta[name="robots"]')
    const previousRobots = robots?.getAttribute('content') || ''

    if (robots) robots.setAttribute('content', 'noindex, nofollow')
    if (reading?.name) {
      document.title = `${reading.name}님의 사주 | 사주미麗`
    } else {
      document.title = '사주 결과 | 사주미麗'
    }

    return () => {
      document.title = previousTitle
      if (robots) robots.setAttribute('content', previousRobots)
    }
  }, [reading])

  useEffect(() => {
    if (!statusMessage) {
      setToastLeaving(false)
      return undefined
    }

    setToastLeaving(false)
    const leaveTimer = setTimeout(() => setToastLeaving(true), 2400)
    return () => clearTimeout(leaveTimer)
  }, [statusMessage])

  useEffect(() => {
    if (!toastLeaving || !statusMessage) return undefined
    const clearTimer = setTimeout(() => {
      setStatusMessage('')
      setToastLeaving(false)
    }, 320)
    return () => clearTimeout(clearTimer)
  }, [toastLeaving, statusMessage])

  async function handleShare() {
    if (!reading?.id) return
    setShareBusy(true)
    const outcome = await shareReading({ id: reading.id, name: reading.name })
    setShareBusy(false)
    if (outcome === 'copied') {
      setStatusMessage('공유 링크를 복사했습니다')
    } else if (outcome === 'failed') {
      setErrorMessage('링크를 복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요.')
    }
  }

  return (
    <main className="page page-shared">
      {statusMessage && (
        <div
          className={`toast${toastLeaving ? ' is-leaving' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

      <section className="sheet sheet-shared">
        <header className="sheet-header">
          <p className="sheet-eyebrow">四柱</p>
          <h1>사주미麗</h1>
          <p className="sheet-lead">
            {isLoading
              ? '공유된 사주 결과를 불러오는 중...'
              : reading
                ? '친구가 공유한 사주 결과입니다'
                : '사주 결과를 찾을 수 없습니다'}
          </p>
        </header>

        {isLoading && (
          <div className="result result-skeleton" aria-busy="true" aria-live="polite">
            <div className="skeleton-line skeleton-heading" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body short" />
            <p className="skeleton-label">명식을 불러오는 중...</p>
          </div>
        )}

        {!isLoading && reading && (
          <SajuResultCard
            name={reading.name}
            birthDate={reading.birth_date}
            birthTime={reading.birth_time}
            gender={reading.gender}
            calendarType={reading.calendar_type}
            displayedResult={reading.result}
            revealInstant
            showShare
            onShare={handleShare}
            shareBusy={shareBusy}
          />
        )}

        {errorMessage && <p className="error">{errorMessage}</p>}

        <a className="shared-home" href="/">
          {reading ? '나도 사주 보러 가기' : '홈으로'}
        </a>
      </section>
    </main>
  )
}

export default SharedResultPage
