'use client'
import { createContext, useContext } from 'react'
import type { UseFormReturn, FieldValues } from 'react-hook-form'

export interface SafeFormContextValue {
  /** react-hook-form instance — used internally by FormField/FormArray */
  rhf: UseFormReturn<FieldValues>
  /** Server-returned field errors, keyed by field path */
  fieldErrors: Record<string, string[]>
  /** Current step index (0-based). Always 0 for single-step forms. */
  currentStep: number
}

export const SafeFormContext = createContext<SafeFormContextValue | null>(null)

export function useSafeFormContext(): SafeFormContextValue {
  const ctx = useContext(SafeFormContext)
  if (!ctx) {
    throw new Error(
      '[safeform] FormField/FormArray must be used inside a useForm() form. ' +
        'Make sure your component is rendered within the form returned by useForm().',
    )
  }
  return ctx
}
