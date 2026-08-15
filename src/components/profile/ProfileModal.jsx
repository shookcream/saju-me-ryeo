import { useEffect, useState } from 'react'
import BirthDateFields from '../form/BirthDateFields'
import { closeTimePickerIfComplete } from '../../utils/timePicker'

const EMPTY_PROFILE = {
  name: '',
  birthDate: '',
  birthTime: '',
  gender: '',
  calendarType: '',
}

function ProfileModal({
  open,
  mode = 'setup',
  initialValues = EMPTY_PROFILE,
  isSaving = false,
  errorMessage = '',
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(EMPTY_PROFILE)
  const [showErrors, setShowErrors] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm({
      name: initialValues.name || '',
      birthDate: initialValues.birthDate || '',
      birthTime: initialValues.birthTime || '',
      gender: initialValues.gender || '',
      calendarType: initialValues.calendarType || '',
    })
    setShowErrors(false)
  }, [open, initialValues])

  if (!open) return null

  const isSetup = mode === 'setup'
  const isComplete = Boolean(
    form.name && form.birthDate && form.gender && form.calendarType
  )

  function fieldClass(value) {
    return `field${showErrors && !value ? ' is-invalid' : ''}`
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!isComplete) {
      setShowErrors(true)
      return
    }
    await onSave(form)
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <div
        className="modal-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <p className="sheet-eyebrow">履歷</p>
          <h2 id="profile-modal-title">
            {isSetup ? '프로필을 먼저 만들어 주세요' : '프로필 수정'}
          </h2>
          <p className="sheet-lead">
            {isSetup
              ? '처음 오신 분입니다. 사주에 필요한 기본 정보를 입력하면 다음에 바로 불러옵니다.'
              : '저장된 기본 정보를 바꾸면 새 사주 만들기에도 반영됩니다.'}
          </p>
        </header>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className={fieldClass(form.name)}>
            <label className="field-label" htmlFor="profile-name">이름</label>
            <input
              id="profile-name"
              type="text"
              value={form.name}
              placeholder="이름을 입력하세요"
              onChange={(e) => updateField('name', e.target.value)}
              disabled={isSaving}
              autoComplete="name"
            />
          </div>

          <div className={fieldClass(form.birthDate)}>
            <label className="field-label" htmlFor="profile-birthDate">생년월일</label>
            <BirthDateFields
              id="profile-birthDate"
              value={form.birthDate}
              onChange={(next) => updateField('birthDate', next)}
              disabled={isSaving}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="profile-birthTime">태어난 시간 (선택)</label>
            <input
              id="profile-birthTime"
              type="time"
              value={form.birthTime}
              onChange={(e) => {
                updateField('birthTime', e.target.value)
                closeTimePickerIfComplete(e)
              }}
              disabled={isSaving}
            />
            <p className="field-hint">모르면 비워 두세요. 시주 없이 해석합니다.</p>
          </div>

          <div className={fieldClass(form.gender)}>
            <span className="field-label">성별</span>
            <div className="choices">
              <label className="choice" htmlFor="profile-gender-male">
                <input
                  id="profile-gender-male"
                  type="radio"
                  name="profile-gender"
                  value="남성"
                  checked={form.gender === '남성'}
                  onChange={(e) => updateField('gender', e.target.value)}
                  disabled={isSaving}
                />
                남성
              </label>
              <label className="choice" htmlFor="profile-gender-female">
                <input
                  id="profile-gender-female"
                  type="radio"
                  name="profile-gender"
                  value="여성"
                  checked={form.gender === '여성'}
                  onChange={(e) => updateField('gender', e.target.value)}
                  disabled={isSaving}
                />
                여성
              </label>
            </div>
          </div>

          <div className={fieldClass(form.calendarType)}>
            <span className="field-label">양력/음력</span>
            <div className="choices">
              <label className="choice" htmlFor="profile-calendar-solar">
                <input
                  id="profile-calendar-solar"
                  type="radio"
                  name="profile-calendar"
                  value="양력"
                  checked={form.calendarType === '양력'}
                  onChange={(e) => updateField('calendarType', e.target.value)}
                  disabled={isSaving}
                />
                양력
              </label>
              <label className="choice" htmlFor="profile-calendar-lunar">
                <input
                  id="profile-calendar-lunar"
                  type="radio"
                  name="profile-calendar"
                  value="음력"
                  checked={form.calendarType === '음력'}
                  onChange={(e) => updateField('calendarType', e.target.value)}
                  disabled={isSaving}
                />
                음력
              </label>
            </div>
          </div>

          {errorMessage && <p className="error">{errorMessage}</p>}

          <div className="modal-actions">
            {!isSetup && (
              <button
                type="button"
                className="ghost-btn"
                onClick={onClose}
                disabled={isSaving}
              >
                닫기
              </button>
            )}
            <button
              type="submit"
              className="submit modal-submit"
              disabled={isSaving}
            >
              {isSaving ? '저장 중...' : isSetup ? '저장하고 시작하기' : '프로필 저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ProfileModal
