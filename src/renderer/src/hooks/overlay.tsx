import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

type OverlayContextValue = {
  enabled: boolean
  setEnabled: (enabled: boolean) => void
  toggle: () => void
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined)

// why are context so complacated. switch to zustand or jotai in the future
export function OverlayProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [enabled, setEnabledState] = useState<boolean>(true)

  // initialize from localStorage
  useEffect(() => {
    const raw = localStorage.getItem("overlayEnabled")
    const initial = raw == null ? true : raw === "true"
    setEnabledState(initial)
    const channel = initial ? "overlay:show" : "overlay:hide"
    window.electron.ipcRenderer.invoke(channel).catch(() => {})
  }, [])

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    localStorage.setItem("overlayEnabled", String(value))
    window.electron.ipcRenderer.invoke(value ? "overlay:show" : "overlay:hide").catch(() => {})
  }, [])

  const toggle = useCallback(() => setEnabled(!enabled), [enabled, setEnabled])

  const value = useMemo<OverlayContextValue>(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle]
  )

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOverlayVisibility(): OverlayContextValue {
  const ctx = useContext(OverlayContext)
  if (!ctx) throw new Error("useOverlayVisibility must be used within OverlayProvider")
  return ctx
}
