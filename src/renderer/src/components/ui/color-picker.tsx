import { useState, useEffect, useRef } from "react"
import { Input } from "./input"

interface ColorPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function ColorPicker({ value, onChange, className }: ColorPickerProps): React.JSX.Element {
  const [localValue, setLocalValue] = useState(value)
  const timeoutRef = useRef<number | null>(null)
  const isFocusedRef = useRef(false)

  useEffect(() => {
    if (!isFocusedRef.current) {
      setLocalValue(value)
    }
  }, [value])

  const handleChange = (newValue: string): void => {
    setLocalValue(newValue)

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = window.setTimeout(() => {
      onChange(newValue)
    }, 50)
  }

  const handleFocus = (): void => {
    isFocusedRef.current = true
  }

  const handleBlur = (): void => {
    isFocusedRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    onChange(localValue)
  }

  return (
    <Input
      type="color"
      value={localValue}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`w-20 h-10 p-0 border-none cursor-pointer ${className || ""}`}
    />
  )
}
