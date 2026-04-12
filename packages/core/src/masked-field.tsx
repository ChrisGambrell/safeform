'use client'
import { useCallback } from 'react'
import { useController } from 'react-hook-form'
import { useSafeFormContext } from './form-context.js'
import {
  resolveMask,
  extractSlotChars,
  applyMask,
  maskedCursorPos,
  maskPlaceholder,
  MASK_TOKENS,
  type BuiltInMask,
} from './mask.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaskedFieldRenderProps {
  /** The current masked display value */
  value: string
  /** Pass directly to <input onChange={...}> */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Pass directly to <input onKeyDown={...}> — handles backspace correctly */
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  /** Pass directly to <input onBlur={...}> */
  onBlur: () => void
  /** Auto-generated placeholder based on the mask pattern (e.g. "(___) ___-____") */
  placeholder: string
  /** Exact length of the mask — useful for <input maxLength={...}> */
  maxLength: number
  /** Combined client + server validation errors */
  errors: string[]
}

export interface MaskedFieldProps {
  name: string
  /**
   * A built-in mask name (e.g. `"phone"`, `"ssn"`) or a custom pattern string.
   *
   * Tokens: `#` = digit, `$` = letter, `*` = any non-whitespace.
   * Everything else is a literal that is auto-inserted as the user types.
   *
   * @example
   * mask="phone"           // built-in: "(###) ###-####"
   * mask="#####-####"      // custom postal code
   * mask="AB-##-$$$$"      // custom: 2 literals, 2 digits, 4 letters
   */
  mask: BuiltInMask | (string & {}) // string & {} keeps autocomplete for built-ins
  /** Override the auto-generated placeholder */
  placeholder?: string
  children: (props: MaskedFieldRenderProps) => React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MaskedField({ name, mask: maskProp, placeholder, children }: MaskedFieldProps) {
  const { rhf, fieldErrors } = useSafeFormContext()
  const { field, fieldState } = useController({ name, control: rhf.control })

  const resolvedMask = resolveMask(maskProp)
  const value = (field.value as string) ?? ''

  const serverErrors = fieldErrors[name] ?? []
  const rhfErrors = fieldState.error?.message ? [fieldState.error.message] : []
  const errors = [...rhfErrors, ...serverErrors]

  // ---------------------------------------------------------------------------
  // onChange — re-apply mask after every keystroke
  // ---------------------------------------------------------------------------

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value
      const slotChars = extractSlotChars(raw, resolvedMask)
      const masked = applyMask(slotChars, resolvedMask)

      field.onChange(masked)

      // Restore cursor after React re-renders
      const newCursor = maskedCursorPos(slotChars.length, resolvedMask)
      requestAnimationFrame(() => {
        e.target.setSelectionRange(newCursor, newCursor)
      })
    },
    [field, resolvedMask],
  )

  // ---------------------------------------------------------------------------
  // onKeyDown — intercept Backspace so it deletes a slot char, not a literal
  // ---------------------------------------------------------------------------

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Backspace') return

      const input = e.currentTarget
      const cursor = input.selectionStart ?? value.length
      const selEnd = input.selectionEnd ?? cursor

      // Selection range — let the browser delete it, onChange will re-mask
      if (cursor !== selEnd) return

      // Count slot positions strictly before the cursor in the masked value
      let slotsBeforeCursor = 0
      for (let i = 0; i < Math.min(cursor, resolvedMask.length); i++) {
        if (resolvedMask[i]! in MASK_TOKENS) slotsBeforeCursor++
      }

      if (slotsBeforeCursor === 0) {
        e.preventDefault()
        return
      }

      // Remove the last slot char before the cursor
      const slotChars = extractSlotChars(value, resolvedMask)
      const newSlotChars =
        slotChars.slice(0, slotsBeforeCursor - 1) + slotChars.slice(slotsBeforeCursor)
      const newMasked = applyMask(newSlotChars, resolvedMask)

      e.preventDefault()
      field.onChange(newMasked)

      const newCursor = maskedCursorPos(slotsBeforeCursor - 1, resolvedMask)
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursor, newCursor)
      })
    },
    [field, resolvedMask, value],
  )

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return children({
    value,
    onChange: handleChange,
    onKeyDown: handleKeyDown,
    onBlur: field.onBlur,
    placeholder: placeholder ?? maskPlaceholder(resolvedMask),
    maxLength: resolvedMask.length,
    errors,
  })
}
