import React, { useState } from "react"
import { Input } from "./input"

export function HotkeyRecorder({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}): React.JSX.Element {
  const [isRecording, setIsRecording] = useState(false)

  function normalizeKey(code: string): string {
    if (code.startsWith("Key")) return code.slice(3)
    if (code.startsWith("Digit")) return code.slice(5)
    if (code.startsWith("Numpad")) return code.replace("Numpad", "Num")
    if (code === "ArrowUp") return "Up"
    if (code === "ArrowDown") return "Down"
    if (code === "ArrowLeft") return "Left"
    if (code === "ArrowRight") return "Right"
    return code
  }

  const excludedKeys = new Set([
    "Control",
    "Shift",
    "Alt",
    "Meta",
    "Escape",
    "ControlLeft",
    "ControlRight",
    "ShiftLeft",
    "ShiftRight",
    "AltLeft",
    "AltRight",
    "MetaLeft",
    "MetaRight"
  ])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.preventDefault()
    const modifiers: string[] = []
    if (e.ctrlKey) modifiers.push("Control")
    if (e.shiftKey) modifiers.push("Shift")
    if (e.altKey) modifiers.push("Alt")
    if (e.metaKey) modifiers.push("Command")
    const key = normalizeKey(e.code)
    if (key && !excludedKeys.has(key)) {
      const parts = [...modifiers, key]
      const hotkey = parts.join("+")
      onChange(hotkey)
      setIsRecording(false)
    }
  }

  const displayHotkey = (hk: string): string => {
    return hk
      .replace("Control", "Ctrl")
      .replace("Command", "Cmd")
      .replace("Alt", "Alt")
      .replace("Shift", "Shift")
      .replace("Num", "Numpad ")
  }

  return (
    <Input
      type="text"
      value={isRecording ? "Press keys..." : displayHotkey(value)}
      readOnly
      onFocus={() => setIsRecording(true)}
      onBlur={() => setIsRecording(false)}
      onKeyDown={handleKeyDown}
    />
  )
}
