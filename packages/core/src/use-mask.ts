'use client'
import { useState, useCallback } from 'react'
import {
  resolveMask,
  extractSlotChars,
  applyMask,
  maskedCursorPos,
  maskPlaceholder,
  MASK_TOKENS,
  type BuiltInMask,
} from './mask.js'

export interface UseMaskReturn {
  /** The formatted display value — spread onto the input's `value` prop */
  value: string
  /** The raw slot characters only, with no literals — use this for form submission / actions */
  rawValue: string
  /** Pass directly to <input onChange={...}> */
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  /** Pass directly to <input onKeyDown={...}> — handles backspace correctly */
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  /** Auto-generated placeholder based on the mask pattern (e.g. "(___) ___-____") */
  placeholder: string
  /** Exact length of the mask — useful for <input maxLength={...}> */
  maxLength: number
}

/**
 * Standalone mask hook. Returns props you can spread onto any input element.
 *
 * Accepts a built-in mask name or a custom pattern string.
 * Tokens: `#` = digit, `$` = letter, `*` = any non-whitespace.
 * Everything else in the pattern is a literal that is auto-inserted as the user types.
 *
 * @example
 * const maskProps = useMask('phone')
 * <input {...maskProps} />
 *
 * @example
 * const maskProps = useMask('date')
 * <Input {...maskProps} className="..." />  // shadcn, Radix, etc.
 *
 * @example
 * const maskProps = useMask('#####-####')  // custom pattern
 * <input {...maskProps} />
 */
export function useMask(mask: BuiltInMask | (string & {})): UseMaskReturn {
  const resolvedMask = resolveMask(mask)

  // Store only the raw slot chars — derive the display value from them
  const [slotChars, setSlotChars] = useState('')
  const value = applyMask(slotChars, resolvedMask)

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newSlotChars = extractSlotChars(e.target.value, resolvedMask)
      setSlotChars(newSlotChars)

      const newCursor = maskedCursorPos(newSlotChars.length, resolvedMask)
      requestAnimationFrame(() => {
        e.target.setSelectionRange(newCursor, newCursor)
      })
    },
    [resolvedMask],
  )

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== 'Backspace') return

      const input = e.currentTarget
      const cursor = input.selectionStart ?? value.length
      const selEnd = input.selectionEnd ?? cursor

      // Selection range — let the browser delete it, onChange will re-mask
      if (cursor !== selEnd) return

      let slotsBeforeCursor = 0
      for (let i = 0; i < Math.min(cursor, resolvedMask.length); i++) {
        if (resolvedMask[i]! in MASK_TOKENS) slotsBeforeCursor++
      }

      if (slotsBeforeCursor === 0) {
        e.preventDefault()
        return
      }

      const newSlotChars =
        slotChars.slice(0, slotsBeforeCursor - 1) + slotChars.slice(slotsBeforeCursor)

      e.preventDefault()
      setSlotChars(newSlotChars)

      const newCursor = maskedCursorPos(slotsBeforeCursor - 1, resolvedMask)
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursor, newCursor)
      })
    },
    [resolvedMask, slotChars, value],
  )

  return {
    value,
    rawValue: slotChars,
    onChange,
    onKeyDown,
    placeholder: maskPlaceholder(resolvedMask),
    maxLength: resolvedMask.length,
  }
}
