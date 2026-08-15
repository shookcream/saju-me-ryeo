import GoogleIcon from '../auth/GoogleIcon'
import {
  formatBirthTime,
  formatDisplayDate,
  formatDisplayDateTime,
} from '../../lib/sajuFormat'

function HistorySidebar({
  user,
  userLabel,
  userAvatar,
  profile,
  profileLoading,
  authBusy,
  authLoading,
  isBusy,
  isHistoryLoading,
  readings,
  selectedId,
  onEditProfile,
  onLogout,
  onLogin,
  onNewSaju,
  onSelectReading,
  onReadingContextMenu,
}) {
  return (
    <aside className="history-sidebar" aria-label="저장된 사주 목록">
      {user ? (
        <div className="auth-card">
          <div className="auth-user">
            {userAvatar ? (
              <img className="auth-avatar" src={userAvatar} alt="" referrerPolicy="no-referrer" />
            ) : (
              <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">
                {userLabel.slice(0, 1)}
              </span>
            )}
            <div className="auth-user-text">
              <p className="auth-user-label">내 프로필</p>
              <p className="auth-user-name">{userLabel}</p>
              {profile && (
                <p className="auth-user-meta">
                  {[
                    formatDisplayDate(profile.birth_date),
                    formatBirthTime(profile.birth_time) || '시간 모름',
                    profile.gender,
                    profile.calendar_type,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
          </div>
          <div className="auth-card-actions">
            <button
              type="button"
              className="auth-profile-edit"
              onClick={onEditProfile}
              disabled={isBusy || profileLoading || !profile}
            >
              프로필 수정
            </button>
            <button
              type="button"
              className="auth-logout"
              onClick={onLogout}
              disabled={authBusy}
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : (
        <div className="auth-card auth-card-guest">
          <p className="auth-guest-title">저장이 필요할 때 로그인</p>
          <p className="auth-guest-copy">
            로그인 없이 사주를 볼 수 있어요. 결과를 보관하려면 구글 로그인을 해 주세요.
          </p>
          <button
            type="button"
            className="google-login google-login-compact"
            onClick={() => onLogin('save')}
            disabled={authBusy || authLoading}
          >
            <GoogleIcon />
            {authBusy ? '구글로 이동 중...' : 'Google로 로그인'}
          </button>
        </div>
      )}

      <p className="history-eyebrow">記錄</p>
      <div className="history-heading-row">
        <h2 className="history-title">저장된 사주</h2>
        {user && !isHistoryLoading && readings.length > 0 && (
          <span className="history-count">{readings.length}</span>
        )}
      </div>
      <button
        type="button"
        className="history-new"
        onClick={onNewSaju}
        disabled={isBusy}
      >
        새 사주 만들기
      </button>
      {!user ? (
        <p className="history-empty">로그인하면 저장한 사주를 여기서 볼 수 있습니다</p>
      ) : isHistoryLoading || (profileLoading && !profile) ? (
        <p className="history-empty">목록을 불러오는 중...</p>
      ) : readings.length === 0 ? (
        <p className="history-empty">아직 저장된 사주가 없습니다</p>
      ) : (
        <ul className="history-list">
          {readings.map((reading) => (
            <li key={reading.id}>
              <button
                type="button"
                className={`history-item${selectedId === reading.id ? ' is-active' : ''}`}
                onClick={() => onSelectReading(reading)}
                onContextMenu={(event) => onReadingContextMenu(event, reading)}
                title="우클릭하면 삭제할 수 있습니다"
              >
                <span className="history-item-top">
                  <span className="history-item-name">{reading.name}</span>
                  <span className="history-item-birth">
                    {formatDisplayDate(reading.birth_date)}
                  </span>
                </span>
                <span className="history-item-meta">
                  {formatDisplayDateTime(reading.created_at)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}

export default HistorySidebar
