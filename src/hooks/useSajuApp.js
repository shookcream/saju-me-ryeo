import { useState, useEffect } from 'react'
import { trackEvent } from '../lib/analytics'
import { supabase } from '../lib/supabase'
import { SAJU_SYSTEM_PROMPT } from '../constants/sajuPrompt'
import {
  persistPendingDraft,
  takeBootPendingDraft,
  hasPendingAutoSaveStarted,
  markPendingAutoSaveStarted,
} from '../lib/pendingDraft'
import {
  formatBirthTime,
  normalizeResultText,
  shareReading,
  toStoredBirthTime,
} from '../lib/sajuFormat'
import { getKoreanAge } from '../utils/age'

export function useSajuApp() {
  // name: 사용자가 입력한 이름을 저장하는 상태
  // setName: name 값을 바꿔 주는 함수
  // 처음에는 아무것도 입력하지 않았으므로 빈 문자열('')로 시작합니다.
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('') // 생년월일 (date input 값)
  const [birthTime, setBirthTime] = useState('') // 태어난 시간 (time input 값)
  const [gender, setGender] = useState('') // 성별 (라디오 버튼 값)
  const [calendarType, setCalendarType] = useState('') // 양력/음력 (라디오 버튼 값)
  const [result, setResult] = useState('') // Gemini가 돌려준 사주 해석 글 전체
  const [displayedResult, setDisplayedResult] = useState('') // 화면에 타이핑처럼 보여 주는 글
  const [isTyping, setIsTyping] = useState(false) // 결과를 한 글자씩 쓰는 중인지
  const [isLoading, setIsLoading] = useState(false) // API를 기다리는 중인지
  const [errorMessage, setErrorMessage] = useState('') // 실패했을 때 보여줄 메시지
  const [statusMessage, setStatusMessage] = useState('') // 저장 완료 같은 짧은 안내
  const [toastLeaving, setToastLeaving] = useState(false) // 토스트 퇴장 애니메이션 중
  const [readings, setReadings] = useState([]) // 사이드바에 보여줄 저장된 사주 목록
  const [selectedId, setSelectedId] = useState(null) // 사이드바에서 고른 기록 id
  const [revealMode, setRevealMode] = useState('type') // type: 타이핑 / instant: 저장본 바로 표시
  const [isHistoryLoading, setIsHistoryLoading] = useState(true) // 목록 첫 로딩
  const [showFieldErrors, setShowFieldErrors] = useState(false) // 빈 칸 강조 표시
  const [isEditing, setIsEditing] = useState(false) // 저장본 입력값만 수정 중인지
  const [isReinterpreting, setIsReinterpreting] = useState(false) // 저장본을 다시 해석해 덮어쓸지
  const [isSaving, setIsSaving] = useState(false) // 수정/삭제 요청 중인지
  const [isUnsaved, setIsUnsaved] = useState(false) // 해석은 됐지만 아직 DB에 안 올린 상태
  const [user, setUser] = useState(null) // 구글 로그인된 Supabase 사용자
  const [authLoading, setAuthLoading] = useState(true) // 세션 확인 중
  const [authBusy, setAuthBusy] = useState(false) // 로그인/로그아웃 진행 중
  const [contextMenu, setContextMenu] = useState(null) // 우클릭 삭제 메뉴 { x, y, reading }
  const [profile, setProfile] = useState(null) // public.users 프로필
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileModal, setProfileModal] = useState(null) // null | 'setup' | 'edit'
  const [profileError, setProfileError] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // 저장본을 그냥 보고 있을 때만 입력칸을 잠급니다.
  const isViewingSaved = Boolean(selectedId) && !isEditing && !isReinterpreting && !isLoading && !isTyping && !isUnsaved
  const isFormComplete = Boolean(name && birthDate && gender && calendarType)
  const isBusy = isLoading || isTyping || isSaving || authBusy || isSavingProfile
  const formLocked = isViewingSaved || isBusy
  const userLabel = profile?.name
    || user?.user_metadata?.full_name
    || user?.user_metadata?.name
    || user?.email
    || '사용자'
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ''
  const profileFormValues = {
    name: profile?.name || name || '',
    birthDate: profile?.birth_date || birthDate || '',
    birthTime: formatBirthTime(profile?.birth_time || birthTime),
    gender: profile?.gender || gender || '',
    calendarType: profile?.calendar_type || calendarType || '',
  }
  const submitLabel = isLoading
    ? '해석 중...'
    : isTyping
      ? '작성 중...'
      : isReinterpreting
        ? '다시 해석하기'
        : '사주 해석하기'
  const saveLabel = isSaving
    ? '저장 중...'
    : !user
      ? '로그인하고 저장하기'
      : isReinterpreting
        ? '수정 내용 저장하기'
        : '저장하기'
  const canSaveResult = Boolean(result) && isUnsaved && !isLoading && !isEditing && !isTyping
  const canShareResult = Boolean(result) && !isLoading && !isTyping && (Boolean(selectedId) || canSaveResult)

  // 구글 로그인 세션을 확인하고, 이후 변화를 계속 듣습니다.
  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return
      if (error) {
        setErrorMessage(`로그인 상태를 확인하지 못했습니다: ${error.message}`)
      }
      setUser(data.session?.user ?? null)
      setAuthLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
      if (event === 'SIGNED_IN') {
        trackEvent('login', { method: 'google' })
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  // 저장된 사주 목록을 Supabase에서 불러옵니다. (로그인한 사용자 것만 RLS로 걸러집니다)
  async function loadReadings() {
    setIsHistoryLoading(true)
    const { data, error } = await supabase
      .from('saju_readings')
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at, user_id')
      .order('created_at', { ascending: false })

    if (error) {
      setErrorMessage(`저장된 사주를 불러오지 못했습니다: ${error.message}`)
      setIsHistoryLoading(false)
      return
    }

    setReadings(data || [])
    setIsHistoryLoading(false)
  }

  // 프로필(users) 정보를 불러와 폼에 채웁니다.
  function applyProfileToForm(nextProfile) {
    if (!nextProfile) return
    setName(nextProfile.name || '')
    setBirthDate(nextProfile.birth_date || '')
    setBirthTime(formatBirthTime(nextProfile.birth_time))
    setGender(nextProfile.gender || '')
    setCalendarType(nextProfile.calendar_type || '')
  }

  async function loadProfile(userId, { skipApplyForm = false } = {}) {
    setProfileLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle()

    setProfileLoading(false)

    if (error) {
      setErrorMessage(`프로필을 불러오지 못했습니다: ${error.message}`)
      return null
    }

    setProfile(data)

    if (!data) {
      return null
    }

    if (!skipApplyForm) {
      applyProfileToForm(data)
    }
    setProfileModal((current) => (current === 'setup' ? null : current))
    return data
  }

  async function ensureProfileFromDraft(userId, draft) {
    const payload = {
      id: userId,
      name: String(draft.name || '').trim(),
      birth_date: draft.birthDate,
      birth_time: toStoredBirthTime(draft.birthTime),
      gender: draft.gender,
      calendar_type: draft.calendarType,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .single()

    if (error) {
      setErrorMessage(`프로필 저장에 실패했습니다: ${error.message}`)
      return null
    }

    setProfile(data)
    setProfileModal(null)
    return data
  }

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setProfile(null)
      setProfileModal(null)
      setProfileError('')
      setReadings([])
      setIsHistoryLoading(false)
      return
    }

    let cancelled = false

    ;(async () => {
      const pending = takeBootPendingDraft()

      if (pending?.result) {
        setName(pending.name || '')
        setBirthDate(pending.birthDate || '')
        setBirthTime(formatBirthTime(pending.birthTime))
        setGender(pending.gender || '')
        setCalendarType(pending.calendarType || '')
        setResult(pending.result)
        setDisplayedResult(pending.result)
        setIsTyping(false)
        setIsUnsaved(true)
        setSelectedId(null)
        setIsEditing(false)
        setIsReinterpreting(false)
        setRevealMode('instant')
        setShowFieldErrors(false)
        setErrorMessage('')
      }

      let loadedProfile = await loadProfile(user.id, { skipApplyForm: Boolean(pending?.result) })
      if (cancelled) return

      if (!loadedProfile && pending?.result) {
        loadedProfile = await ensureProfileFromDraft(user.id, pending)
        if (cancelled) return
      }

      if (loadedProfile) {
        await loadReadings()
      } else {
        setReadings([])
        setIsHistoryLoading(false)
        if (!pending?.result) {
          setProfileModal('setup')
        }
      }

      if (!pending?.result || hasPendingAutoSaveStarted()) return
      markPendingAutoSaveStarted()

      setIsSaving(true)
      const saved = await createReading(pending.result, pending)
      if (cancelled) return
      setIsSaving(false)

      if (saved) {
        trackEvent('save_reading', { mode: 'create', via: 'login' })
        setStatusMessage('로그인되어 사주가 저장되었습니다')

        if (!loadedProfile) {
          setProfileModal('setup')
        }

        if (pending.intent === 'share') {
          const outcome = await shareReading({ id: saved.id, name: pending.name })
          trackEvent('share', { method: outcome, context: 'app', via: 'login' })
          if (outcome === 'copied') {
            setStatusMessage('저장 후 공유 링크를 복사했습니다')
          } else if (outcome === 'failed') {
            setErrorMessage('링크를 복사하지 못했습니다. 잠시 후 다시 시도해 주세요.')
          }
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, authLoading])

  // 우클릭 메뉴는 바깥 클릭·스크롤·Esc로 닫습니다.
  useEffect(() => {
    if (!contextMenu) return undefined

    function closeContextMenu() {
      setContextMenu(null)
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') closeContextMenu()
    }

    window.addEventListener('click', closeContextMenu)
    window.addEventListener('scroll', closeContextMenu, true)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('click', closeContextMenu)
      window.removeEventListener('scroll', closeContextMenu, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  // 토스트는 잠시 보이다가, 사라질 때도 fade-out 애니메이션으로 퇴장합니다.
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

  // 새 해석은 타이핑, 저장본은 한 번에 예쁘게 보여 줍니다.
  useEffect(() => {
    if (!result) {
      setDisplayedResult('')
      setIsTyping(false)
      return
    }

    if (revealMode === 'instant') {
      setDisplayedResult(result)
      setIsTyping(false)
      return
    }

    setDisplayedResult('')
    setIsTyping(true)

    let index = 0
    const charsPerTick = 2
    const intervalId = setInterval(() => {
      index += charsPerTick

      if (index >= result.length) {
        setDisplayedResult(result)
        setIsTyping(false)
        clearInterval(intervalId)
        return
      }

      setDisplayedResult(result.slice(0, index))
    }, 28)

    // 컴포넌트가 사라지거나, 새 해석이 시작되면 타이머를 끕니다.
    return () => clearInterval(intervalId)
  }, [result, revealMode])

  // 사이드바에서 이름을 누르면, 그 기록의 입력값과 사주 결과를 바로 예쁘게 불러옵니다.
  function handleSelectReading(reading) {
    trackEvent('select_history', { reading_id: reading.id })
    const savedResult = normalizeResultText(reading.result)
    setSelectedId(reading.id)
    setName(reading.name || '')
    setBirthDate(reading.birth_date || '')
    setBirthTime(formatBirthTime(reading.birth_time))
    setGender(reading.gender || '')
    setCalendarType(reading.calendar_type || '')
    setErrorMessage('')
    setStatusMessage('')
    setShowFieldErrors(false)
    setIsLoading(false)
    setIsEditing(false)
    setIsReinterpreting(false)
    setIsUnsaved(false)
    setRevealMode('instant')
    setResult(savedResult)
    setDisplayedResult(savedResult)
    setIsTyping(false)

    // 결과 카드가 보이도록 부드럽게 스크롤합니다.
    requestAnimationFrame(() => {
      document.getElementById('saju-result')?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    })
  }

  // 입력·결과·선택 상태를 모두 비우고 빈 사주 작성 화면으로 돌아갑니다.
  function handleNewSaju() {
    const alreadyOnNewPage = (
      !selectedId
      && !isEditing
      && !isReinterpreting
      && !isUnsaved
      && !result
      && !isLoading
      && !isTyping
      && !name
      && !birthDate
      && !birthTime
      && !gender
      && !calendarType
    )

    if (alreadyOnNewPage) {
      setErrorMessage('')
      // 같은 문구라도 다시 누르면 토스트가 다시 뜨도록 잠깐 비웁니다.
      setStatusMessage('')
      requestAnimationFrame(() => {
        setStatusMessage('이미 새 사주 작성 화면입니다')
        document.getElementById('name')?.focus()
      })
      return
    }

    trackEvent('new_saju')
    setSelectedId(null)
    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('')
    setResult('')
    setDisplayedResult('')
    setIsTyping(false)
    setIsLoading(false)
    setIsEditing(false)
    setIsReinterpreting(false)
    setIsUnsaved(false)
    setErrorMessage('')
    setShowFieldErrors(false)
    setRevealMode('type')
    setStatusMessage('새 사주 작성 화면으로 이동했어요')

    requestAnimationFrame(() => {
      document.getElementById('name')?.focus()
    })
  }

  // users 테이블에 프로필을 저장합니다. (첫 설정은 insert, 수정은 upsert)
  async function handleSaveProfile(form) {
    if (!user?.id) return

    setIsSavingProfile(true)
    setProfileError('')

    const payload = {
      id: user.id,
      name: form.name.trim(),
      birth_date: form.birthDate,
      birth_time: toStoredBirthTime(form.birthTime),
      gender: form.gender,
      calendar_type: form.calendarType,
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select('id, name, birth_date, birth_time, gender, calendar_type, created_at, updated_at')
      .single()

    setIsSavingProfile(false)

    if (error) {
      setProfileError(`프로필 저장에 실패했습니다: ${error.message}`)
      return
    }

    const wasSetup = profileModal === 'setup'
    trackEvent('save_profile', { mode: wasSetup ? 'setup' : 'edit' })
    setProfile(data)
    applyProfileToForm(data)
    setProfileModal(null)
    setStatusMessage('프로필이 저장되었습니다')

    if (wasSetup) {
      await loadReadings()
    }
  }

  // Google OAuth로 로그인합니다. Supabase 대시보드에 등록된 redirect URL로 돌아옵니다.
  async function handleGoogleLogin(intent = 'save') {
    if (result && isUnsaved) {
      persistPendingDraft({
        name,
        birthDate,
        birthTime,
        gender,
        calendarType,
        result,
        intent,
      })
    }

    trackEvent('login_click', { method: 'google', intent })
    setAuthBusy(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })

    if (error) {
      setAuthBusy(false)
      setErrorMessage(`구글 로그인에 실패했습니다: ${error.message}`)
      trackEvent('login_error', { method: 'google' })
    }
  }

  // 로그아웃하고 화면을 초기화합니다.
  async function handleLogout() {
    setAuthBusy(true)
    setErrorMessage('')

    const { error } = await supabase.auth.signOut()
    setAuthBusy(false)

    if (error) {
      setErrorMessage(`로그아웃에 실패했습니다: ${error.message}`)
      return
    }

    trackEvent('logout')

    setProfile(null)
    setProfileModal(null)
    setProfileError('')
    setSelectedId(null)
    setName('')
    setBirthDate('')
    setBirthTime('')
    setGender('')
    setCalendarType('')
    setResult('')
    setDisplayedResult('')
    setIsTyping(false)
    setIsLoading(false)
    setIsEditing(false)
    setIsReinterpreting(false)
    setIsUnsaved(false)
    setShowFieldErrors(false)
    setRevealMode('type')
    setReadings([])
    setStatusMessage('로그아웃되었습니다')
  }

  // 저장본 입력값을 수정할 수 있게 잠금을 풉니다. (Update)
  function handleStartEdit() {
    setIsEditing(true)
    setIsReinterpreting(false)
    setErrorMessage('')
    setStatusMessage('')
    setShowFieldErrors(false)

    requestAnimationFrame(() => {
      document.getElementById('name')?.focus()
    })
  }

  // 수정 모드를 취소하고 원래 저장본으로 되돌립니다.
  function handleCancelEdit() {
    const current = readings.find((item) => item.id === selectedId)
    if (!current) {
      setIsEditing(false)
      return
    }
    handleSelectReading(current)
  }

  // 저장본 내용을 유지한 채 다시 해석해 같은 기록을 덮어쓸 준비를 합니다. (Update)
  function handleReinterpret() {
    trackEvent('reinterpret_start')
    setIsEditing(false)
    setIsReinterpreting(true)
    setResult('')
    setDisplayedResult('')
    setIsTyping(false)
    setIsUnsaved(false)
    setErrorMessage('')
    setStatusMessage('')
    setShowFieldErrors(false)
    setRevealMode('type')

    requestAnimationFrame(() => {
      document.getElementById('name')?.focus()
    })
  }

  // 타이핑 애니메이션을 건너뛰고 전체 결과를 바로 보여 줍니다.
  function handleSkipTyping() {
    if (!result || !isTyping) return
    trackEvent('skip_typing')
    setRevealMode('instant')
    setDisplayedResult(result)
    setIsTyping(false)
  }

  // Create: 새 사주 기록을 추가합니다.
  async function createReading(outputText, fields = null) {
    if (!user?.id) {
      setErrorMessage('로그인이 필요합니다. 구글로 로그인해 주세요.')
      return null
    }

    const nextName = fields?.name ?? name
    const nextBirthDate = fields?.birthDate ?? birthDate
    const nextBirthTime = fields?.birthTime ?? birthTime
    const nextGender = fields?.gender ?? gender
    const nextCalendarType = fields?.calendarType ?? calendarType

    const { data, error } = await supabase
      .from('saju_readings')
      .insert({
        user_id: user.id,
        name: nextName,
        birth_date: nextBirthDate,
        birth_time: toStoredBirthTime(nextBirthTime),
        gender: nextGender,
        calendar_type: nextCalendarType,
        result: outputText,
      })
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
      .single()

    if (error) {
      setErrorMessage(`사주 결과 저장에 실패했습니다: ${error.message}`)
      return null
    }

    setReadings((prev) => [data, ...prev.filter((item) => item.id !== data.id)])
    setSelectedId(data.id)
    setIsEditing(false)
    setIsReinterpreting(false)
    setIsUnsaved(false)
    setStatusMessage('사주가 저장되었습니다')
    return data
  }

  // Update: 다시 해석한 결과로 기존 기록을 덮어씁니다.
  async function updateReadingResult(outputText, targetId) {
    const { data, error } = await supabase
      .from('saju_readings')
      .update({
        name,
        birth_date: birthDate,
        birth_time: toStoredBirthTime(birthTime),
        gender,
        calendar_type: calendarType,
        result: outputText,
      })
      .eq('id', targetId)
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
      .single()

    if (error) {
      setErrorMessage(`사주 결과 수정에 실패했습니다: ${error.message}`)
      return null
    }

    setReadings((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    setSelectedId(data.id)
    setIsEditing(false)
    setIsReinterpreting(false)
    setIsUnsaved(false)
    setStatusMessage('사주가 수정되었습니다')
    return data
  }

  // Update: 해석 글은 두고 입력 정보만 수정합니다.
  async function handleSaveInfo() {
    if (!selectedId) return

    if (!isFormComplete) {
      setShowFieldErrors(true)
      setErrorMessage('이름, 생년월일, 성별, 양력/음력을 모두 입력해 주세요.')
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('saju_readings')
      .update({
        name,
        birth_date: birthDate,
        birth_time: toStoredBirthTime(birthTime),
        gender,
        calendar_type: calendarType,
      })
      .eq('id', selectedId)
      .select('id, name, birth_date, birth_time, gender, calendar_type, result, created_at')
      .single()

    setIsSaving(false)

    if (error) {
      setErrorMessage(`정보 수정에 실패했습니다: ${error.message}`)
      return
    }

    setReadings((prev) => prev.map((item) => (item.id === data.id ? data : item)))
    setIsEditing(false)
    setShowFieldErrors(false)
    setStatusMessage('정보가 수정되었습니다')
    trackEvent('save_info')
  }

  // Delete: 선택한 사주 기록(또는 목록에서 고른 기록)을 삭제합니다.
  async function handleDeleteReading(reading = null) {
    const target = reading || readings.find((item) => item.id === selectedId)
    if (!target?.id) return

    setContextMenu(null)

    const confirmed = window.confirm(`${target.name || '이 사주'} 기록을 삭제할까요?`)
    if (!confirmed) return

    setIsSaving(true)
    setErrorMessage('')

    const { error } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', target.id)

    setIsSaving(false)

    if (error) {
      setErrorMessage(`삭제에 실패했습니다: ${error.message}`)
      return
    }

    trackEvent('delete_reading')
    setReadings((prev) => prev.filter((item) => item.id !== target.id))

    if (selectedId === target.id) {
      handleNewSaju()
    }

    setStatusMessage('사주가 삭제되었습니다')
  }

  // 기록 항목을 우클릭하면 삭제 메뉴를 띄웁니다.
  function handleReadingContextMenu(event, reading) {
    event.preventDefault()
    if (isBusy) return

    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      reading,
    })
  }

  // 해석 결과를 Create 또는 Update로 저장합니다.
  async function saveReading(outputText, targetId = null) {
    if (targetId) {
      return updateReadingResult(outputText, targetId)
    }
    return createReading(outputText)
  }

  // 저장된 결과의 공유 링크를 만들거나, 아직이면 저장한 뒤 공유합니다.
  async function handleShareReading() {
    if (!canShareResult) return

    if (!user) {
      if (!isFormComplete) {
        setShowFieldErrors(true)
        setErrorMessage('이름, 생년월일, 성별, 양력/음력을 모두 입력해 주세요.')
        return
      }
      setStatusMessage('공유하려면 구글 로그인이 필요합니다')
      await handleGoogleLogin('share')
      return
    }

    let readingId = selectedId

    if (canSaveResult) {
      setIsSaving(true)
      setErrorMessage('')
      const saveMode = isReinterpreting ? 'update' : 'create'
      const saved = await saveReading(result, isReinterpreting ? selectedId : null)
      setIsSaving(false)
      readingId = saved?.id
      if (!readingId) return
      trackEvent('save_reading', { mode: saveMode, via: 'share' })
    }

    if (!readingId) {
      setErrorMessage('저장된 사주만 공유할 수 있습니다. 먼저 저장해 주세요.')
      return
    }

    const outcome = await shareReading({ id: readingId, name })
    trackEvent('share', { method: outcome, context: 'app' })
    if (outcome === 'copied') {
      setStatusMessage('공유 링크를 복사했습니다')
    } else if (outcome === 'failed') {
      setErrorMessage('링크를 복사하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    }
  }

  // 사용자가 저장하기를 눌렀을 때만 DB에 올립니다.
  async function handleSaveReading() {
    if (!canSaveResult) return

    if (!isFormComplete) {
      setShowFieldErrors(true)
      setErrorMessage('이름, 생년월일, 성별, 양력/음력을 모두 입력해 주세요.')
      return
    }

    if (!user) {
      setStatusMessage('저장하려면 구글 로그인이 필요합니다')
      await handleGoogleLogin('save')
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    const targetId = isReinterpreting ? selectedId : null
    const saved = await saveReading(result, targetId)
    if (saved) {
      trackEvent('save_reading', { mode: targetId ? 'update' : 'create' })
    }

    setIsSaving(false)
  }

  // 버튼 클릭 시 Gemini Interactions API를 호출합니다.
  async function handleAskSaju() {
    // 비어 있는 칸이 있으면 API를 부르지 않습니다.
    if (!isFormComplete) {
      setShowFieldErrors(true)
      setErrorMessage('이름, 생년월일, 성별, 양력/음력을 모두 입력해 주세요.')
      const firstEmptyId = !name
        ? 'name'
        : !birthDate
          ? 'birthDate'
          : null
      if (firstEmptyId) {
        document.getElementById(firstEmptyId)?.focus()
      }
      return
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY
    if (!apiKey) {
      setErrorMessage('API 키가 없습니다. 프로젝트 폴더의 .env 파일을 확인해 주세요.')
      return
    }

    const age = getKoreanAge(birthDate)

    // 사용자가 입력한 정보를 Gemini에게 보내는 본문입니다.
    const birthTimeLabel = formatBirthTime(birthTime) || '모름'
    const userInput = `이름: ${name}
성별: ${gender}
나이: 만 ${age}세
생년월일: ${birthDate}
태어난 시간: ${birthTimeLabel}
달력: ${calendarType}

위 정보를 바탕으로 사주 기본 차트를 세우고 해석해 주세요.${
      birthTime
        ? ''
        : '\n태어난 시간을 모르므로 시주를 추정하지 말고, 년주·월주·일주만으로 해석해 주세요.'
    }`

    const updateTargetId = isReinterpreting ? selectedId : null
    const askMode = updateTargetId ? 'reinterpret' : 'new'

    trackEvent('saju_ask', { mode: askMode })
    setIsLoading(true)
    setErrorMessage('')
    setStatusMessage('')
    setShowFieldErrors(false)
    setResult('')
    setDisplayedResult('')
    setIsTyping(false)
    setIsUnsaved(false)
    if (!updateTargetId) {
      setSelectedId(null)
    }
    setRevealMode('type')

    try {
      // Interactions API: POST /v1beta/interactions
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/interactions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            model: 'gemini-3.6-flash',
            system_instruction: SAJU_SYSTEM_PROMPT,
            input: userInput,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        // Gemini가 에러를 주면 message를 꺼내서 보여 줍니다.
        throw new Error(data.error?.message || '사주 해석 요청에 실패했습니다.')
      }

      // output_text는 @google/genai SDK가 만들어 주는 값입니다.
      // fetch로 직접 호출하면 보통 없고, 실제 글은 steps 안에 들어 있습니다.
      const texts = (data.steps || [])
        .filter((step) => step.type === 'model_output')
        .flatMap((step) => step.content || [])
        .filter((part) => part.type === 'text' && part.text)
        .map((part) => part.text)

      const outputText = data.output_text || texts.join('\n')
      const finalText = outputText || '해석 결과를 받지 못했습니다.'
      setResult(finalText)

      // 자동 저장하지 않고, 저장하기 버튼을 누를 수 있게만 표시합니다.
      if (outputText) {
        setIsUnsaved(true)
        trackEvent('saju_complete', { mode: askMode })
      } else {
        trackEvent('saju_error', { mode: askMode, reason: 'empty_output' })
      }
    } catch (error) {
      setErrorMessage(error.message)
      trackEvent('saju_error', { mode: askMode, reason: 'request_failed' })
    } finally {
      // 성공이든 실패든, 로딩은 끝냅니다.
      setIsLoading(false)
    }
  }

  function handleFormKeyDown(event) {
    if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA') return
    if (isViewingSaved || isBusy) return
    event.preventDefault()
    if (isEditing) {
      handleSaveInfo()
      return
    }
    handleAskSaju()
  }

  return {
    name, setName,
    birthDate, setBirthDate,
    birthTime, setBirthTime,
    gender, setGender,
    calendarType, setCalendarType,
    result,
    displayedResult,
    isTyping,
    isLoading,
    errorMessage,
    statusMessage,
    toastLeaving,
    readings,
    selectedId,
    revealMode,
    isHistoryLoading,
    showFieldErrors,
    isEditing,
    isReinterpreting,
    isSaving,
    isUnsaved,
    user,
    authLoading,
    authBusy,
    contextMenu,
    setContextMenu,
    profile,
    profileLoading,
    profileModal,
    setProfileModal,
    profileError,
    setProfileError,
    isSavingProfile,
    isViewingSaved,
    isFormComplete,
    isBusy,
    formLocked,
    userLabel,
    userAvatar,
    profileFormValues,
    submitLabel,
    saveLabel,
    canSaveResult,
    canShareResult,
    handleSelectReading,
    handleNewSaju,
    handleSaveProfile,
    handleGoogleLogin,
    handleLogout,
    handleStartEdit,
    handleCancelEdit,
    handleReinterpret,
    handleSkipTyping,
    handleSaveInfo,
    handleDeleteReading,
    handleReadingContextMenu,
    handleShareReading,
    handleSaveReading,
    handleAskSaju,
    handleFormKeyDown,
    openProfileEdit() {
      setProfileError('')
      setProfileModal('edit')
    },
    closeProfileModal() {
      if (profileModal === 'edit') {
        setProfileModal(null)
        setProfileError('')
      }
    },
  }
}
