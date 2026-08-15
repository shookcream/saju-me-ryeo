function ModeBanners({
  name,
  isViewingSaved,
  isEditing,
  isReinterpreting,
  isBusy,
  isSaving,
  readings,
  selectedId,
  onShare,
  onStartEdit,
  onReinterpret,
  onDelete,
  onNewSaju,
  onCancelEdit,
  onSaveInfo,
  onSelectReading,
}) {
  return (
    <>
      {isViewingSaved && (
        <div className="mode-banner" role="status">
          <p className="mode-banner-text">
            <strong>{name}</strong>님의 저장본입니다. 수정·다시 해석·삭제가 가능합니다.
          </p>
          <div className="mode-banner-actions">
            <button type="button" className="ghost-btn" onClick={onShare} disabled={isBusy}>
              공유하기
            </button>
            <button type="button" className="ghost-btn" onClick={onStartEdit} disabled={isBusy}>
              정보 수정
            </button>
            <button type="button" className="ghost-btn" onClick={onReinterpret} disabled={isBusy}>
              이 정보로 다시 해석
            </button>
            <button type="button" className="ghost-btn ghost-btn-danger" onClick={onDelete} disabled={isBusy}>
              삭제
            </button>
            <button type="button" className="ghost-btn ghost-btn-strong" onClick={onNewSaju} disabled={isBusy}>
              새 사주 만들기
            </button>
          </div>
        </div>
      )}

      {isEditing && (
        <div className="mode-banner" role="status">
          <p className="mode-banner-text">
            이름·생년월일 등 입력 정보만 바꾸고 저장할 수 있습니다. 해석 글은 그대로 둡니다.
          </p>
          <div className="mode-banner-actions">
            <button type="button" className="ghost-btn" onClick={onCancelEdit} disabled={isBusy}>
              수정 취소
            </button>
            <button type="button" className="ghost-btn ghost-btn-strong" onClick={onSaveInfo} disabled={isBusy}>
              {isSaving ? '저장 중...' : '변경 내용 저장'}
            </button>
          </div>
        </div>
      )}

      {isReinterpreting && (
        <div className="mode-banner" role="status">
          <p className="mode-banner-text">
            다시 해석한 뒤 <strong>저장하기</strong>를 눌러야 기존 기록이 덮어써집니다.
          </p>
          <div className="mode-banner-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                const current = readings.find((item) => item.id === selectedId)
                if (current) onSelectReading(current)
              }}
              disabled={isBusy}
            >
              다시 해석 취소
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export default ModeBanners
