import { useState } from 'react'
import { starItem, unstarItem } from '../api/stars'

function StarButton({
  isStarred = false,
  resourceType = 'file',
  resourceId,
  size = 18,
  className = '',
  onToggle,
}) {
  const [starred, setStarred] = useState(isStarred)
  const [busy, setBusy] = useState(false)

  async function handleClick(event) {
    event.stopPropagation()
    event.preventDefault()
    if (busy || !resourceId) return

    const nextState = !starred
    setStarred(nextState) // Optimistic update
    setBusy(true)

    try {
      if (nextState) {
        await starItem(resourceType, resourceId)
      } else {
        await unstarItem(resourceType, resourceId)
      }
      if (onToggle) onToggle(nextState)
    } catch (err) {
      console.error('Failed to toggle star:', err)
      setStarred(!nextState) // Rollback on failure
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      aria-label={starred ? 'Unstar' : 'Star'}
      className={`star-button inline-flex items-center justify-center transition-transform hover:scale-125 focus:outline-none ${className}`}
      disabled={busy}
      onClick={handleClick}
      title={starred ? 'Starred' : 'Add to starred'}
      type="button"
    >
      <span
        style={{ fontSize: `${size}px`, lineHeight: 1 }}
        className={starred ? 'text-amber-400 drop-shadow-sm' : 'text-[#c2bcaf] hover:text-amber-400'}
      >
        {starred ? '★' : '☆'}
      </span>
    </button>
  )
}

export default StarButton
