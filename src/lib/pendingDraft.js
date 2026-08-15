const PENDING_SAVE_KEY = 'saju-pending-save'

// OAuth 리다이렉트·StrictMode 중복 실행에도 같은 초안을 한 번만 처리합니다.
let bootPendingDraft = undefined
let pendingAutoSaveStarted = false

export function persistPendingDraft(draft) {
  try {
    sessionStorage.setItem(PENDING_SAVE_KEY, JSON.stringify(draft))
  } catch {
    // 저장 공간이 없어도 로그인은 진행합니다.
  }
}

export function takeBootPendingDraft() {
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

export function hasPendingAutoSaveStarted() {
  return pendingAutoSaveStarted
}

export function markPendingAutoSaveStarted() {
  pendingAutoSaveStarted = true
}
