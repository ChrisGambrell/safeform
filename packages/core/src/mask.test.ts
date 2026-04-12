import { describe, it, expect } from 'vitest'
import {
  extractSlotChars,
  applyMask,
  maskedCursorPos,
  maskPlaceholder,
  resolveMask,
  MASKS,
} from './mask.js'

// ---------------------------------------------------------------------------
// resolveMask
// ---------------------------------------------------------------------------

describe('resolveMask()', () => {
  it('resolves a built-in mask name', () => {
    expect(resolveMask('phone')).toBe('(###) ###-####')
    expect(resolveMask('ssn')).toBe('###-##-####')
    expect(resolveMask('postalCode')).toBe('#####')
  })

  it('returns a raw pattern string unchanged', () => {
    expect(resolveMask('#####-####')).toBe('#####-####')
    expect(resolveMask('AB-##-$$$$')).toBe('AB-##-$$$$')
  })
})

// ---------------------------------------------------------------------------
// extractSlotChars
// ---------------------------------------------------------------------------

describe('extractSlotChars()', () => {
  it('extracts digits from a phone mask', () => {
    expect(extractSlotChars('(555) 123-4567', '(###) ###-####')).toBe('5551234567')
  })

  it('extracts digits from a partial phone value', () => {
    expect(extractSlotChars('(555) ', '(###) ###-####')).toBe('555')
  })

  it('ignores characters that do not match the token', () => {
    // 'abc' has no digits — none should match '#' tokens
    expect(extractSlotChars('abc', '###')).toBe('')
  })

  it('ignores excess characters beyond the mask slots', () => {
    expect(extractSlotChars('12345678', '###')).toBe('123')
  })

  it('handles a mix of # and $ tokens', () => {
    // mask: '#-$$$', value has correct chars
    expect(extractSlotChars('5-abc', '#-$$$')).toBe('5abc')
  })

  it('strips mask literals that appear in the value', () => {
    // pasted value with dashes — should still extract digits
    expect(extractSlotChars('123-45-6789', '###-##-####')).toBe('123456789')
  })

  it('handles * token (any non-whitespace)', () => {
    expect(extractSlotChars('a1!', '***')).toBe('a1!')
  })

  it('handles a fresh value with no mask context', () => {
    expect(extractSlotChars('55512', '(###) ###-####')).toBe('55512')
  })
})

// ---------------------------------------------------------------------------
// applyMask
// ---------------------------------------------------------------------------

describe('applyMask()', () => {
  it('formats a full phone number', () => {
    expect(applyMask('5551234567', '(###) ###-####')).toBe('(555) 123-4567')
  })

  it('formats a partial phone number', () => {
    expect(applyMask('555', '(###) ###-####')).toBe('(555) ')
  })

  it('formats a single digit', () => {
    expect(applyMask('5', '(###) ###-####')).toBe('(5')
  })

  it('handles an empty slot chars string', () => {
    expect(applyMask('', '(###) ###-####')).toBe('')
  })

  it('handles custom # and $ mix', () => {
    expect(applyMask('5abc', '#-$$$')).toBe('5-abc')
  })

  it('formats SSN', () => {
    expect(applyMask('123456789', '###-##-####')).toBe('123-45-6789')
  })

  it('auto-inserts inter-group literals after the last filled slot', () => {
    // After 3 digits, ") " sits between the filled group and the next group — auto-inserted
    expect(applyMask('555', '(###) ###-####')).toBe('(555) ')
    // When all 10 slots are filled the " x" separator before the extension group is also
    // auto-inserted (same rule: slotIdx <= slotChars.length at that literal position)
    expect(applyMask('5551234567', '(###) ###-#### x###')).toBe('(555) 123-4567 x')
  })

  it('formats postal code full', () => {
    expect(applyMask('123456789', '#####-####')).toBe('12345-6789')
  })
})

// ---------------------------------------------------------------------------
// maskedCursorPos
// ---------------------------------------------------------------------------

describe('maskedCursorPos()', () => {
  it('returns 0 slots → 0 cursor', () => {
    expect(maskedCursorPos(0, '(###) ###-####')).toBe(14) // falls through to mask.length
  })

  it('positions after 1st digit in phone mask', () => {
    // mask: "(###) ###-####", 1st '#' is at index 1 → cursor at 2
    expect(maskedCursorPos(1, '(###) ###-####')).toBe(2)
  })

  it('positions after 3rd digit (before literal)', () => {
    // mask: "(###) ###-####", 3rd '#' is at index 3 → cursor at 4
    expect(maskedCursorPos(3, '(###) ###-####')).toBe(4)
  })

  it('positions after 4th digit (past ") " literals)', () => {
    // mask: "(###) ###-####", 4th '#' is at index 6 → cursor at 7
    expect(maskedCursorPos(4, '(###) ###-####')).toBe(7)
  })

  it('returns mask.length when numSlots exceeds available slots', () => {
    expect(maskedCursorPos(99, '###')).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// maskPlaceholder
// ---------------------------------------------------------------------------

describe('maskPlaceholder()', () => {
  it('replaces # with _', () => {
    expect(maskPlaceholder('#####')).toBe('_____')
  })

  it('replaces $ with _', () => {
    expect(maskPlaceholder('$$-$$')).toBe('__-__')
  })

  it('replaces * with _', () => {
    expect(maskPlaceholder('**')).toBe('__')
  })

  it('preserves literals', () => {
    expect(maskPlaceholder('(###) ###-####')).toBe('(___) ___-____')
    expect(maskPlaceholder('#####-####')).toBe('_____-____')
  })

  it('handles mixed tokens and literals', () => {
    expect(maskPlaceholder('#-$$$')).toBe('_-___')
  })
})

// ---------------------------------------------------------------------------
// MASKS — built-in masks smoke test
// ---------------------------------------------------------------------------

describe('MASKS', () => {
  it('phone formats correctly', () => {
    expect(applyMask('5551234567', MASKS.phone)).toBe('(555) 123-4567')
  })

  it('ssn formats correctly', () => {
    expect(applyMask('123456789', MASKS.ssn)).toBe('123-45-6789')
  })

  it('postalCode formats correctly', () => {
    expect(applyMask('12345', MASKS.postalCode)).toBe('12345')
  })

  it('postalCodeFull formats correctly', () => {
    expect(applyMask('123456789', MASKS.postalCodeFull)).toBe('12345-6789')
  })

  it('creditCard formats correctly', () => {
    expect(applyMask('1234567890123456', MASKS.creditCard)).toBe('1234 5678 9012 3456')
  })

  it('date formats correctly', () => {
    expect(applyMask('12312024', MASKS.date)).toBe('12/31/2024')
  })

  it('ein formats correctly', () => {
    expect(applyMask('123456789', MASKS.ein)).toBe('12-3456789')
  })
})
