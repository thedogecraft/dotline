import { useState } from "react"
import { Input } from "./input"

export function HotkeyRecorder({
  value,
  onChange
}: {
  value: string
  onChange: (value: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const modifiers: string[] = []
    if (e.ctrlKey) modifiers.push("Control")
    if (e.shiftKey) modifiers.push("Shift")
    if (e.altKey) modifiers.push("Alt")
    if (e.metaKey) modifiers.push("Command")
    let key = e.code
    if (key && !["Control", "Shift", "Alt", "Meta", "Escape"].includes(key)) {
      if (key.startsWith("Numpad")) {
        key = key.replace("Numpad", "Num")
      }
      const parts = [...modifiers, key]
      const hotkey = parts.join("+")
      onChange(hotkey)
      setIsRecording(false)
    }
  }

  const displayHotkey = (hk: string) => {
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
