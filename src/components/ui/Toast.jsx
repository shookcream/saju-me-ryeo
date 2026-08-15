function Toast({ message, leaving }) {
  if (!message) return null

  return (
    <div
      className={`toast${leaving ? ' is-leaving' : ''}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  )
}

export default Toast
