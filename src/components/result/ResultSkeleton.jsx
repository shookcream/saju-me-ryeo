import Ryeongi from '../ui/Ryeongi'

function ResultSkeleton({ label = '명식을 살피는 중...' }) {
  return (
    <div className="result result-skeleton" aria-busy="true" aria-live="polite">
      <Ryeongi pose="loading" />
      <div className="skeleton-line skeleton-heading" />
      <div className="skeleton-line skeleton-body" />
      <div className="skeleton-line skeleton-body" />
      <div className="skeleton-line skeleton-body short" />
      <p className="skeleton-label">{label}</p>
    </div>
  )
}

export default ResultSkeleton
