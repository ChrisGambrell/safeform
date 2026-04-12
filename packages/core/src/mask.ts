// ---------------------------------------------------------------------------
// Mask token definitions
//   #  →  digit        (0–9)
//   $  →  letter       (a–z, A–Z)
//   *  →  any non-whitespace
//   anything else  →  literal (auto-inserted, never typed)
// ---------------------------------------------------------------------------

export const MASK_TOKENS: Readonly<Record<string, RegExp>> = {
  '#': /\d/,
  '$': /[a-zA-Z]/,
  '*': /\S/,
}

// ---------------------------------------------------------------------------
// Built-in named masks
// ---------------------------------------------------------------------------

export const MASKS = {
  creditCard:     '#### #### #### ####',
  cvv:            '###',
  cvv4:           '####',
  date:           '##/##/####',
  dateTime:       '##/##/#### ##:##',
  ein:            '##-#######',
  phone:          '(###) ###-####',
  postalCode:     '#####',
  postalCodeFull: '#####-####',
  ssn:            '###-##-####',
  time:           '##:##',
} as const satisfies Record<string, string>

export type BuiltInMask = keyof typeof MASKS

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Resolve a built-in mask name or raw pattern string to a pattern. */
export function resolveMask(mask: string): string {
  return mask in MASKS ? MASKS[mask as BuiltInMask] : mask
}

/**
 * Extract the user-typed "slot" characters from a value that may already
 * contain mask literals.
 *
 * Algorithm:
 *   1. Collect all literal characters defined by the mask.
 *   2. Strip those literals from the raw input to get candidate characters.
 *   3. Walk the mask's slot tokens in order, accepting only candidates that
 *      satisfy each token's regex (skipping invalid ones).
 */
export function extractSlotChars(value: string, mask: string): string {
  const literals = new Set<string>()
  for (const ch of mask) {
    if (!(ch in MASK_TOKENS)) literals.add(ch)
  }

  const candidates = [...value].filter(ch => !literals.has(ch))
  const tokens = [...mask].filter(ch => ch in MASK_TOKENS)

  let result = ''
  let candidateIdx = 0

  for (let tokenIdx = 0; tokenIdx < tokens.length && candidateIdx < candidates.length; tokenIdx++) {
    const token = tokens[tokenIdx]!
    // Skip candidates that don't satisfy this token
    while (candidateIdx < candidates.length && !MASK_TOKENS[token]!.test(candidates[candidateIdx]!)) {
      candidateIdx++
    }
    if (candidateIdx < candidates.length) {
      result += candidates[candidateIdx++]
    }
  }

  return result
}

/**
 * Apply a mask pattern to a string of slot characters, auto-inserting literals.
 *
 * Literals that sit between two filled slots are always inserted.
 * Trailing literals after the last filled slot are NOT appended.
 */
export function applyMask(slotChars: string, mask: string): string {
  if (slotChars.length === 0) return ''

  let result = ''
  let slotIdx = 0

  for (let i = 0; i < mask.length; i++) {
    const ch = mask[i]!
    if (ch in MASK_TOKENS) {
      if (slotIdx >= slotChars.length) break
      result += slotChars[slotIdx++]
    } else {
      // Insert the literal only while we're within the filled region.
      // slotIdx <= slotChars.length means all slots up to this point are filled,
      // so the literal sits between two filled positions — auto-insert it.
      if (slotIdx <= slotChars.length) result += ch
    }
  }

  return result
}

/**
 * Return the cursor position in the masked string that corresponds to having
 * `numSlots` slot characters filled.
 */
export function maskedCursorPos(numSlots: number, mask: string): number {
  let slots = 0
  for (let i = 0; i < mask.length; i++) {
    if (mask[i]! in MASK_TOKENS) {
      slots++
      if (slots === numSlots) return i + 1
    }
  }
  return mask.length
}

/** Return the default placeholder for a mask — slots become `_`, literals are kept. */
export function maskPlaceholder(mask: string): string {
  return [...mask].map(ch => (ch in MASK_TOKENS ? '_' : ch)).join('')
}
