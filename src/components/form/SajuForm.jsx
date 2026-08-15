import BirthDateFields from './BirthDateFields'
import { closeTimePickerIfComplete } from '../../utils/timePicker'
import { fieldClass } from '../../utils/fieldClass'

function SajuForm({
  name,
  birthDate,
  birthTime,
  gender,
  calendarType,
  showFieldErrors,
  formLocked,
  onNameChange,
  onBirthDateChange,
  onBirthTimeChange,
  onGenderChange,
  onCalendarTypeChange,
  onKeyDown,
}) {
  return (
    <div className="form-block" onKeyDown={onKeyDown}>
      <div className={fieldClass(name, showFieldErrors)}>
        <label className="field-label" htmlFor="name">이름</label>
        <input
          id="name"
          type="text"
          placeholder="이름을 입력하세요"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          disabled={formLocked}
          autoComplete="name"
        />
      </div>

      <div className={fieldClass(birthDate, showFieldErrors)}>
        <label className="field-label" htmlFor="birthDate">생년월일</label>
        <BirthDateFields
          id="birthDate"
          value={birthDate}
          onChange={onBirthDateChange}
          disabled={formLocked}
        />
      </div>

      <div className="field">
        <label className="field-label" htmlFor="birthTime">태어난 시간 (선택)</label>
        <input
          id="birthTime"
          type="time"
          value={birthTime}
          onChange={(e) => {
            onBirthTimeChange(e.target.value)
            closeTimePickerIfComplete(e)
          }}
          disabled={formLocked}
        />
        <p className="field-hint">모르면 비워 두세요. 시주 없이 해석합니다.</p>
      </div>

      <div className={fieldClass(gender, showFieldErrors)}>
        <span className="field-label">성별</span>
        <div className="choices">
          <label className="choice" htmlFor="gender-male">
            <input
              id="gender-male"
              type="radio"
              name="gender"
              value="남성"
              checked={gender === '남성'}
              onChange={(e) => onGenderChange(e.target.value)}
              disabled={formLocked}
            />
            남성
          </label>
          <label className="choice" htmlFor="gender-female">
            <input
              id="gender-female"
              type="radio"
              name="gender"
              value="여성"
              checked={gender === '여성'}
              onChange={(e) => onGenderChange(e.target.value)}
              disabled={formLocked}
            />
            여성
          </label>
        </div>
      </div>

      <div className={fieldClass(calendarType, showFieldErrors)}>
        <span className="field-label">양력/음력</span>
        <div className="choices">
          <label className="choice" htmlFor="calendar-solar">
            <input
              id="calendar-solar"
              type="radio"
              name="calendarType"
              value="양력"
              checked={calendarType === '양력'}
              onChange={(e) => onCalendarTypeChange(e.target.value)}
              disabled={formLocked}
            />
            양력
          </label>
          <label className="choice" htmlFor="calendar-lunar">
            <input
              id="calendar-lunar"
              type="radio"
              name="calendarType"
              value="음력"
              checked={calendarType === '음력'}
              onChange={(e) => onCalendarTypeChange(e.target.value)}
              disabled={formLocked}
            />
            음력
          </label>
        </div>
      </div>
    </div>
  )
}

export default SajuForm
