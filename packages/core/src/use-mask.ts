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
  /** The current masked display value */
  value: string
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
  const [value, setValue] = useState('')

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const slotChars = extractSlotChars(e.target.value, resolvedMask)
      const masked = applyMask(slotChars, resolvedMask)
      setValue(masked)

      const newCursor = maskedCursorPos(slotChars.length, resolvedMask)
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

      const slotChars = extractSlotChars(value, resolvedMask)
      const newSlotChars =
        slotChars.slice(0, slotsBeforeCursor - 1) + slotChars.slice(slotsBeforeCursor)
      const newMasked = applyMask(newSlotChars, resolvedMask)

      e.preventDefault()
      setValue(newMasked)

      const newCursor = maskedCursorPos(slotsBeforeCursor - 1, resolvedMask)
      requestAnimationFrame(() => {
        input.setSelectionRange(newCursor, newCursor)
      })
    },
    [resolvedMask, value],
  )

  return {
    value,
    onChange,
    onKeyDown,
    placeholder: maskPlaceholder(resolvedMask),
    maxLength: resolvedMask.length,
  }
}
