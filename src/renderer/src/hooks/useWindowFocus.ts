import { useEffect, useState } from 'react'

/**
 * Custom hook that tracks window focus state.
 * Returns true when the window is focused, false when unfocused.
 */
export function useWindowFocus(): boolean {
  const [isWindowFocused, setIsWindowFocused] = useState(() => {
    // Initialize with current focus state
    return document.hasFocus()
  })

  useEffect(() => {
    const handleFocus = () => {
      setIsWindowFocused(true)
    }

    const handleBlur = () => {
      setIsWindowFocused(false)
    }

    // Listen for window focus/blur events
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)

    // Also listen for document visibility changes (for when tab is hidden)
    const handleVisibilityChange = () => {
      setIsWindowFocused(!document.hidden)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  return isWindowFocused
}
