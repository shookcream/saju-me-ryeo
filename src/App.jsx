import { useState, useEffect } from 'react'
import './App.css'
import { trackEvent } from './lib/analytics'
import { supabase } from './lib/supabase'
import ProfileModal from './ProfileModal'
import Ryeongi from './Ryeongi'
import SajuResultCard from './SajuResultCard'
import {
  formatBirthTime,
  formatDisplayDate,
  formatDisplayDateTime,
  normalizeResultText,
  shareReading,
  toStoredBirthTime,
} from './sajuFormat'

// Gemini에게 역할을 알려 주는 시스템 프롬프트입니다.
// 실제 생년월일 데이터는 아래 handleAskSaju에서 따로 붙여 보냅니다.
const SAJU_SYSTEM_PROMPT = `return only Korean.

당신은 세계 최고의 사주 해석 전문가다. 논리와 구조 중심으로 사주를 해석하며, 수천 명의 인생을 분석해 온 경험이 있다. 분석은 매우 냉정하고 직설적으로 진행되며, 감정에 휘둘리지 않는다. 그러나 의외로 인간 내면에 대한 깊은 통찰을 지니고 있고 장점과 단점을 냉정하게 말한다.

질문: 사주를 통해 이 사람의 전반적인 성격, 기질, 재능을 분석해 주세요.
사용자가 사주 용어에 익숙하지 않다고 가정하고, 쉽고 명확한 말로 설명하며 중요한 포인트에서는 핵심 사주 근거를 밝혀주세요.
1) 사주 명식을 바탕으로 차분하지만 흥미롭게 설명해 주세요.
2) 사주에서 특이하거나 눈에 띄는 점이 있으면 알려주세요.
3) 약점도 솔직하게 말해 주세요.
4) 돋보이는 특징을 최소 한 가지 뽑아 명확히 설명해 주세요.
5) 마지막은 질문으로 끝내지 마세요. 대신 "## 총정리" 또는 "## 결론" 제목 아래, 이 사람의 핵심 성격·강점·주의점·삶의 방향을 3~5문장으로 압축해 마무리하세요.
6) 판단 근거는 사용자가 제공한 모든 정보와 해석 가능한 모든 사주 정보를 종합해 제시해 주세요.
7) 긍정적 해석과 부정적 해석을 모두 고려해 주세요.
이외에도 특이한점 한가지를 찾아서 언급해 주세요.
답변 끝에서 사용자에게 되묻거나, 연애운·진로 등 추가 질문을 유도하지 마세요.

먼저 제공된 생년월일·시간·성별·양력/음력을 바탕으로 사주 명식(년주, 월주, 일주, 시주), 오행 분포, 십신, 지장간, 십이운성, 12신살, 공망, 대운·세운을 세운 뒤 위 규칙대로 해석하세요.
태어난 시간이 없거나 '모름'이면 시주를 추정하거나 임의의 시간을 가정하지 마세요. 년주·월주·일주만으로 해석하고, 시주가 없어 시간 관련 해석은 제한적이라는 점을 짧게 밝히세요.
답변은 한국어로만 작성하세요.
또한 정확한 해석을 해야 하므로 결과 확인을 할 때마다 내용이 지속적으로 바뀌면 안됩니다.`

// 시·분이 모두 채워지면 time 선택 창을 닫습니다. (date input과 비슷한 사용감)
function closeTimePickerIfComplete(event) {
  const value = event.target.value
  if (/^\d{2}:\d{2}/.test(value)) {
    event.target.blur()
  }
}

const PENDING_SAVE_KEY = 'saju-pending-save'
// OAuth 리다이렉트·StrictMode 중복 실행에도 같은 초안을 한 번만 처리합니다.
let bootPendingDraft = undefined
let pendingAutoSaveStarted = false

function persistPendingDraft(draft) {
  try {
    sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(draft))
  } catch {
    // 저장 공간이 없어도 로그인은 진행합니다.
  }
}

function takeBootPendingDraft() {
  if (bootPendingDraft !== undefined) return bootPendingDraft
  try {
    const raw = sessionStorage.getItem(PENDING_SAVE_KEY)
    bootPendingDraft = raw ? JSON.parse(raw) : null
    if (raw) sessionStorage.removeItem(PENDING_SAVE_KEY)
  } catch {
    bootPendingDraft = null
    sessionStorage.removeItem(PENDING_SAVE_KEY)
  }
  return bootPendingDraft
}

function GoogleIcon() {
  return (
    <svg className="google-login-icon" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.69 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

function App() {
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

      if (!pending?.result || pendingAutoSaveStarted) return
      pendingAutoSaveStarted = true

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

  // 생년월일로 만 나이를 계산합니다.
  function getKoreanAge(dateString) {
    const today = new Date()
    const birth = new Date(dateString)
    let age = today.getFullYear() - birth.getFullYear()
    const monthDiff = today.getMonth() - birth.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age -= 1
    }
    return age
  }

  function fieldClass(value) {
    return `field${showFieldErrors && !value ? ' is-invalid' : ''}`
  }

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

  return (
    <main className="page">
      {statusMessage && (
        <div
          className={`toast${toastLeaving ? ' is-leaving' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </div>
      )}

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
                onClick={() => {
                  setProfileError('')
                  setProfileModal('edit')
                }}
                disabled={isBusy || profileLoading || !profile}
              >
                프로필 수정
              </button>
              <button
                type="button"
                className="auth-logout"
                onClick={handleLogout}
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
              onClick={() => handleGoogleLogin('save')}
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
          onClick={handleNewSaju}
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
                  onClick={() => {
                    setContextMenu(null)
                    handleSelectReading(reading)
                  }}
                  onContextMenu={(event) => handleReadingContextMenu(event, reading)}
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

      {contextMenu && (
        <div
          className="context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          <button
            type="button"
            className="context-menu-item context-menu-danger"
            role="menuitem"
            disabled={isBusy}
            onClick={() => handleDeleteReading(contextMenu.reading)}
          >
            삭제
          </button>
        </div>
      )}

      <section className={`sheet${isViewingSaved ? ' is-viewing' : ''}`}>
        <header className="sheet-header">
          <p className="sheet-eyebrow">四柱</p>
          <div className="sheet-title-row">
            <h1>사주미麗</h1>
            <Ryeongi pose="title" />
          </div>
          <p className="sheet-lead">
            {isViewingSaved
              ? '저장된 명식을 보고 있습니다'
              : isEditing
                ? '저장본 정보를 수정하고 있습니다'
                : isReinterpreting
                  ? '같은 기록을 다시 해석해 덮어씁니다'
                  : profile
                    ? '프로필 정보로 바로 사주를 볼 수 있습니다'
                    : '생년월일을 적으면 명식을 풀어 드립니다'}
          </p>
        </header>

        {isViewingSaved && (
          <div className="mode-banner" role="status">
            <p className="mode-banner-text">
              <strong>{name}</strong>님의 저장본입니다. 수정·다시 해석·삭제가 가능합니다.
            </p>
            <div className="mode-banner-actions">
              <button type="button" className="ghost-btn" onClick={handleShareReading} disabled={isBusy}>
                공유하기
              </button>
              <button type="button" className="ghost-btn" onClick={handleStartEdit} disabled={isBusy}>
                정보 수정
              </button>
              <button type="button" className="ghost-btn" onClick={handleReinterpret} disabled={isBusy}>
                이 정보로 다시 해석
              </button>
              <button type="button" className="ghost-btn ghost-btn-danger" onClick={handleDeleteReading} disabled={isBusy}>
                삭제
              </button>
              <button type="button" className="ghost-btn ghost-btn-strong" onClick={handleNewSaju} disabled={isBusy}>
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
              <button type="button" className="ghost-btn" onClick={handleCancelEdit} disabled={isBusy}>
                수정 취소
              </button>
              <button type="button" className="ghost-btn ghost-btn-strong" onClick={handleSaveInfo} disabled={isBusy}>
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
                  if (current) handleSelectReading(current)
                }}
                disabled={isBusy}
              >
                다시 해석 취소
              </button>
            </div>
          </div>
        )}

        <div className="form-block" onKeyDown={handleFormKeyDown}>
          <div className={fieldClass(name)}>
            {/* htmlFor와 input의 id를 같게 하면, 라벨을 눌러도 입력창에 포커스가 갑니다. */}
            <label className="field-label" htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              placeholder="이름을 입력하세요"
              // value={name}: input에 보이는 글자를 name 상태와 연결합니다.
              value={name}
              // onChange: 사용자가 글자를 칠 때마다 실행됩니다.
              // e.target.value는 지금 입력창에 적힌 글자입니다.
              // setName으로 name 상태를 바꾸면, 아래 <p>도 함께 다시 그려집니다.
              onChange={(e) => setName(e.target.value)}
              disabled={formLocked}
              autoComplete="name"
            />
          </div>

          <div className={fieldClass(birthDate)}>
            <label className="field-label" htmlFor="birthDate">생년월일</label>
            <input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              disabled={formLocked}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="birthTime">태어난 시간 (선택)</label>
            <input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={(e) => {
                setBirthTime(e.target.value)
                closeTimePickerIfComplete(e)
              }}
              disabled={formLocked}
            />
            <p className="field-hint">모르면 비워 두세요. 시주 없이 해석합니다.</p>
          </div>

          <div className={fieldClass(gender)}>
            <span className="field-label">성별</span>
            {/* name이 같으면 둘 중 하나만 선택할 수 있습니다. */}
            {/* checked: 지금 gender 상태와 이 버튼의 value가 같으면 체크됩니다. */}
            <div className="choices">
              <label className="choice" htmlFor="gender-male">
                <input
                  id="gender-male"
                  type="radio"
                  name="gender"
                  value="남성"
                  checked={gender === '남성'}
                  onChange={(e) => setGender(e.target.value)}
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
                  onChange={(e) => setGender(e.target.value)}
                  disabled={formLocked}
                />
                여성
              </label>
            </div>
          </div>

          <div className={fieldClass(calendarType)}>
            <span className="field-label">양력/음력</span>
            <div className="choices">
              <label className="choice" htmlFor="calendar-solar">
                <input
                  id="calendar-solar"
                  type="radio"
                  name="calendarType"
                  value="양력"
                  checked={calendarType === '양력'}
                  onChange={(e) => setCalendarType(e.target.value)}
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
                  onChange={(e) => setCalendarType(e.target.value)}
                  disabled={formLocked}
                />
                음력
              </label>
            </div>
          </div>
        </div>

        {/* name이 바뀔 때마다 이 문장도 실시간으로 바뀝니다. */}
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

        {/* 해석 중에는 결과 자리에 스켈레톤을 보여 줍니다. */}
        {isLoading && (
          <div className="result result-skeleton" aria-busy="true" aria-live="polite">
            <Ryeongi pose="loading" />
            <div className="skeleton-line skeleton-heading" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body" />
            <div className="skeleton-line skeleton-body short" />
            <p className="skeleton-label">명식을 살피는 중...</p>
          </div>
        )}

        {/* displayedResult가 늘어날 때마다 화면에 이어서 작성되는 것처럼 보입니다. */}
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

      <ProfileModal
        open={profileModal === 'setup' || profileModal === 'edit'}
        mode={profileModal === 'edit' ? 'edit' : 'setup'}
        initialValues={profileFormValues}
        isSaving={isSavingProfile}
        errorMessage={profileError}
        onSave={handleSaveProfile}
        onClose={() => {
          if (profileModal === 'edit') {
            setProfileModal(null)
            setProfileError('')
          }
        }}
      />
    </main>
  )
}

export default App
