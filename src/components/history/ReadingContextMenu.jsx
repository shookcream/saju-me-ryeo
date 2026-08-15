function ReadingContextMenu({ contextMenu, isBusy, onDelete }) {
  if (!contextMenu) return null

  return (
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
        onClick={() => onDelete(contextMenu.reading)}
      >
        삭제
      </button>
    </div>
  )
}

export default ReadingContextMenu
