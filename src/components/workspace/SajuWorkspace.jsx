import ModeBanners from '../form/ModeBanners'
import Ryeongi from '../ui/Ryeongi'
import ResultSkeleton from '../result/ResultSkeleton'
import SajuForm from '../form/SajuForm'
import SajuResultCard from '../result/SajuResultCard'

function SajuWorkspace(props) {
  const {
    name,
    birthDate,
    birthTime,
    gender,
    calendarType,
    profile,
    result,
    displayedResult,
    isViewingSaved,
    isEditing,
    isReinterpreting,
    isBusy,
    isSaving,
    isLoading,
    isTyping,
    isUnsaved,
    showFieldErrors,
    formLocked,
    revealMode,
    selectedId,
    readings,
    errorMessage,
    submitLabel,
    saveLabel,
    canSaveResult,
    canShareResult,
    setName,
    setBirthDate,
    setBirthTime,
    setGender,
    setCalendarType,
    handleFormKeyDown,
    handleAskSaju,
    handleSkipTyping,
    handleShareReading,
    handleStartEdit,
    handleReinterpret,
    handleDeleteReading,
    handleNewSaju,
    handleCancelEdit,
    handleSaveInfo,
    handleSelectReading,
    handleSaveReading,
  } = props

  const sheetLead = isViewingSaved
    ? '저장된 명식을 보고 있습니다'
    : isEditing
      ? '저장본 정보를 수정하고 있습니다'
      : isReinterpreting
        ? '같은 기록을 다시 해석해 덮어씁니다'
        : profile
          ? '프로필 정보로 바로 사주를 볼 수 있습니다'
          : '생년월일을 적으면 명식을 풀어 드립니다'

  return (
    <section className={`sheet${isViewingSaved ? ' is-viewing' : ''}`}>
      <header className="sheet-header">
        <p className="sheet-eyebrow">四柱</p>
        <div className="sheet-title-block">
          <h1>사주미麗</h1>
          <p className="sheet-lead">{sheetLead}</p>
          <Ryeongi pose="titleTop" />
          <Ryeongi pose="title" />
        </div>
      </header>

      <ModeBanners
        name={name}
        isViewingSaved={isViewingSaved}
        isEditing={isEditing}
        isReinterpreting={isReinterpreting}
        isBusy={isBusy}
        isSaving={isSaving}
        readings={readings}
        selectedId={selectedId}
        onShare={handleShareReading}
        onStartEdit={handleStartEdit}
        onReinterpret={handleReinterpret}
        onDelete={handleDeleteReading}
        onNewSaju={handleNewSaju}
        onCancelEdit={handleCancelEdit}
        onSaveInfo={handleSaveInfo}
        onSelectReading={handleSelectReading}
      />

      <SajuForm
        name={name}
        birthDate={birthDate}
        birthTime={birthTime}
        gender={gender}
        calendarType={calendarType}
        showFieldErrors={showFieldErrors}
        formLocked={formLocked}
        onNameChange={setName}
        onBirthDateChange={setBirthDate}
        onBirthTimeChange={setBirthTime}
        onGenderChange={setGender}
        onCalendarTypeChange={setCalendarType}
        onKeyDown={handleFormKeyDown}
      />

      <p className="preview">{name ? `${name}님의 사주` : '이름을 입력해 주세요'}</p>

      {!isViewingSaved && !isEditing && (
        <button
          className="submit"
          type="button"
          onClick={handleAskSaju}
          disabled={isBusy}
        >
          {submitLabel}
        </button>
      )}

      {isTyping && (
        <button
          type="button"
          className="skip-typing"
          onClick={handleSkipTyping}
        >
          결과 전체 보기
        </button>
      )}

      {errorMessage && <p className="error">{errorMessage}</p>}

      {isLoading && <ResultSkeleton />}

      {!isLoading && displayedResult && (
        <SajuResultCard
          key={selectedId || `live-${result.slice(0, 24)}`}
          name={name}
          birthDate={birthDate}
          birthTime={birthTime}
          gender={gender}
          calendarType={calendarType}
          displayedResult={displayedResult}
          isTyping={isTyping}
          revealInstant={revealMode === 'instant' || !isTyping}
          showShare={canShareResult}
          onShare={handleShareReading}
          shareBusy={isSaving}
        />
      )}

      {isUnsaved && !isLoading && result && !canSaveResult && isTyping && (
        <p className="status">작성이 끝나면 저장할 수 있습니다</p>
      )}

      {canSaveResult && (
        <button
          className="submit save-btn"
          type="button"
          onClick={handleSaveReading}
          disabled={isBusy}
        >
          {saveLabel}
        </button>
      )}
    </section>
  )
}

export default SajuWorkspace
