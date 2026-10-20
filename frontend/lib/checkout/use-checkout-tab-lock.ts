import * as React from "react"

// One key for Project Details, Payment and Review, so a tab on any of them
// warns a tab on any other. The id lives in module scope: it survives moving
// between these pages in one tab and is new after a reload or a new tab
// (sessionStorage would be copied into a duplicated tab).
const CHECKOUT_TAB_LOCK_KEY = "checkout-active-tab"
const tabId = `${Date.now()}-${Math.random().toString(36).slice(2)}`

export function useCheckoutTabLock() {
  const [isOtherTabOpen, setIsOtherTabOpen] = React.useState(false)

  React.useEffect(() => {
    try {
      const existingTabId = window.localStorage.getItem(CHECKOUT_TAB_LOCK_KEY)
      if (existingTabId && existingTabId !== tabId) {
        setIsOtherTabOpen(true)
      }
      window.localStorage.setItem(CHECKOUT_TAB_LOCK_KEY, tabId)
    } catch {
      return
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === CHECKOUT_TAB_LOCK_KEY &&
        event.newValue &&
        event.newValue !== tabId
      ) {
        setIsOtherTabOpen(true)
      }
    }
    window.addEventListener("storage", handleStorageChange)

    const releaseLock = () => {
      try {
        if (window.localStorage.getItem(CHECKOUT_TAB_LOCK_KEY) === tabId) {
          window.localStorage.removeItem(CHECKOUT_TAB_LOCK_KEY)
        }
      } catch {
        return
      }
    }
    window.addEventListener("pagehide", releaseLock)

    return () => {
      window.removeEventListener("storage", handleStorageChange)
      window.removeEventListener("pagehide", releaseLock)
      releaseLock()
    }
  }, [])

  const continueHere = React.useCallback(() => {
    try {
      window.localStorage.setItem(CHECKOUT_TAB_LOCK_KEY, tabId)
    } catch {
      // The warning still closes when storage is blocked.
    }
    setIsOtherTabOpen(false)
  }, [])

  return { isOtherTabOpen, setIsOtherTabOpen, continueHere }
}
