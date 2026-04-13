'use client'
import { createContext, useContext } from 'react'
import type { UseFormReturn, FieldValues } from 'react-hook-form'
import type { Action } from './types.js'

export interface SafeFormContextValue {
  /** react-hook-form instance — used internally by FormField/FormArray */
  rhf: UseFormReturn<FieldValues>
  /** Server-returned field errors, keyed by field path */
  fieldErrors: Record<string, string[]>
  /** Current step index (0-based). Always 0 for single-step forms. */
  currentStep: number
  /** True while the form submission is in-flight */
  isPending: boolean
}

/**
 * A SafeFormContextValue branded with the action type.
 *
 * Pass this (as `ctx`) to reusable field components so TypeScript can infer
 * valid `name` values from the action's schema without repeating the type.
 *
 * @example
 * const { _ctx, handleSubmit } = useForm<UpsertEmployeeAction>({ ... })
 * // _ctx is TypedCtx<UpsertEmployeeAction>
 * <TextField ctx={_ctx} name="firstName" label="First Name" />
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TypedCtx<TAction extends Action<any, any, any, any>> =
  SafeFormContextValue & { readonly _action?: TAction }

export const SafeFormContext = createContext<SafeFormContextValue | null>(null)

export function useSafeFormContext(): SafeFormContextValue {
  const ctx = useContext(SafeFormContext)
  if (!ctx) {
    throw new Error(
      '[@safeform/core] FormField/FormArray must be used inside a useForm() form. ' +
        'Make sure your component is rendered within the form returned by useForm().',
    )
  }
  return ctx
}

/**
 * Returns `isPending` from the nearest `SafeFormContext.Provider`, or `false`
 * if called outside one. Safe to use in button components that may live inside
 * or outside a form Provider.
 */
export function useIsPending(): boolean {
  return useContext(SafeFormContext)?.isPending ?? false
}
