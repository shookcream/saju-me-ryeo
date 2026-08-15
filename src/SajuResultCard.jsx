import { formatBirthTime, formatDisplayDate } from './sajuFormat'
import Ryeongi from './Ryeongi'

function renderSajuResult(text, showCursor = false) {
  const lines = text.split('\n')

  return lines.map((line, index) => {
    const isLastLine = index === lines.length - 1
    const cursor = showCursor && isLastLine
      ? <span className="typing-cursor" aria-hidden="true" />
      : null
    const headingMatch = line.match(/^\s*#{1,6}\s*(.*)$/)

    if (headingMatch) {
      return (
        <p key={index} className="result-heading">
          {headingMatch[1].replace(/\*/g, '')}
          {cursor}
        </p>
      )
    }

    if (line.trim() === '') {
      return (
        <p key={index} className="result-line">
          {cursor || <br />}
        </p>
      )
    }

    const parts = line.split(/(\*\*[^*]+\*\*)/g)
    return (
      <p key={index} className="result-line">
        {parts.map((part, partIndex) => {
          const boldMatch = part.match(/^\*\*([^*]+)\*\*$/)
          if (boldMatch) {
            return <strong key={partIndex}>{boldMatch[1]}</strong>
          }
          return part.replace(/\*/g, '')
        })}
        {cursor}
      </p>
    )
  })
}

function SajuResultCard({
  cardId = 'saju-result',
  name,
  birthDate,
  birthTime,
  gender,
  calendarType,
  displayedResult,
  isTyping = false,
  revealInstant = true,
  showShare = false,
  onShare,
  shareBusy = false,
}) {
  return (
    <div
      id={cardId}
      className={`result${revealInstant || !isTyping ? ' result-instant' : ''}`}
    >
      <Ryeongi pose="result" />
      <div className="result-meta">
        <div className="result-meta-row">
          <div>
            <p className="result-meta-name">{name || '이름 없음'}님의 명식</p>
            <p className="result-meta-detail">
              {[
                formatDisplayDate(birthDate),
                formatBirthTime(birthTime) || '시간 모름',
                gender,
                calendarType,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
          {showShare && (
            <button
              type="button"
              className="share-btn"
              onClick={onShare}
              disabled={shareBusy}
            >
              {shareBusy ? '준비 중...' : '공유하기'}
            </button>
          )}
        </div>
      </div>
      <div className="result-body">
        {renderSajuResult(displayedResult, isTyping)}
      </div>
    </div>
  )
}

export default SajuResultCard
