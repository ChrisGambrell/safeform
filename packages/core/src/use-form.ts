import { useState, useCallback, useRef } from 'react'
import { useForm as useRHF, type FieldValues } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { isZodTuple, isNamedSteps } from './schema.js'
import type { NamedSteps } from './schema.js'
import type { Action } from './types.js'
import type { SafeFormContextValue } from './form-context.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface SafeFormState<TData> {
  fieldErrors: Record<string, string[]>
  error: string | null
  data: TData | null
  isPending: boolean
}

export interface UseFormOptions<TPayload, TData> {
  endpoint: string
  schema: z.ZodTypeAny
  payload?: TPayload
  onSuccess?: (data: TData) => void
  onError?: (error: string) => void
}

export interface UseFormReturn<TData> {
  /** Submit handler — pass to <form onSubmit={handleSubmit}> */
  handleSubmit: (e: React.FormEvent) => void
  /** Current form state */
  state: SafeFormState<TData>
  /** Context value for FormField/FormArray — pass to SafeFormContext.Provider */
  _ctx: SafeFormContextValue
  // Multi-step controls (always present; only meaningful when isMultiStep is true)
  step: number
  totalSteps: number
  isFirstStep: boolean
  isLastStep: boolean
  /** Validate current step and advance. No-op on the last step. */
  next: () => Promise<void>
  /** Go back one step without validation. No-op on the first step. */
  prev: () => void
  isMultiStep: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type ServerResponse = {
  success: boolean
  data?: unknown
  error?: string
  fieldErrors?: Record<string, string[]>
}

function getStepSchema(
  schema: z.ZodTypeAny,
  step: number,
): z.ZodObject<z.ZodRawShape> {
  if (isZodTuple(schema)) {
    const items = (schema as z.ZodTuple<any>).items as z.ZodObject<z.ZodRawShape>[]
    return items[step] ?? items[0]!
  }
  if (isNamedSteps(schema)) {
    const steps = (schema as NamedSteps<Record<string, z.ZodObject<z.ZodRawShape>>>)._steps
    const schemas = Object.values(steps)
    return schemas[step] ?? schemas[0]!
  }
  return schema as z.ZodObject<z.ZodRawShape>
}

function getTotalSteps(schema: z.ZodTypeAny): number {
  if (isZodTuple(schema)) return (schema as z.ZodTuple<any>).items.length
  if (isNamedSteps(schema))
    return Object.keys((schema as NamedSteps<Record<string, z.ZodObject<z.ZodRawShape>>>)._steps).length
  return 1
}

// ---------------------------------------------------------------------------
// useForm
// ---------------------------------------------------------------------------

/**
 * Core safeform hook. Wraps react-hook-form, handles client-side Zod
 * validation, fetches the API endpoint, and maps server responses to state.
 *
 * @example
 * import type { UpsertEmployeeAction } from '@/actions/employees'
 *
 * const { handleSubmit, state } = useForm<UpsertEmployeeAction>({
 *   endpoint: '/api/employees',
 *   schema: upsertEmployeeSchema,
 *   payload: { employeeId: employee?.id },
 *   onSuccess: (data) => router.push(`/employees/${data.employeeId}`),
 *   onError: (error) => toast.error(error),
 * })
 */
export function useForm<TAction extends Action<any, any, any, any>>(
  options: UseFormOptions<
    TAction['_payload'] extends z.ZodTypeAny ? z.output<TAction['_payload']> : never,
    TAction['_data']
  >,
): UseFormReturn<TAction['_data']> {
  const { endpoint, schema, payload, onSuccess, onError } = options

  const isTuple = isZodTuple(schema)
  const isNamed = isNamedSteps(schema)
  const isMultiStep = isTuple || isNamed
  const totalSteps = getTotalSteps(schema)

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [step, setStep] = useState(0)
  const [state, setState] = useState<SafeFormState<TAction['_data']>>({
    fieldErrors: {},
    error: null,
    data: null,
    isPending: false,
  })

  // Accumulated step data for multi-step forms
  const stepDataRef = useRef<unknown[]>([])

  // ---------------------------------------------------------------------------
  // react-hook-form — resolver updates when step changes
  // ---------------------------------------------------------------------------

  const rhf = useRHF<FieldValues>({
    resolver: zodResolver(getStepSchema(schema, step)),
    mode: 'onSubmit',
  })

  // ---------------------------------------------------------------------------
  // POST helper
  // ---------------------------------------------------------------------------

  const postToServer = useCallback(
    async (data: unknown) => {
      setState((s) => ({ ...s, isPending: true, error: null, fieldErrors: {} }))

      let res: Response
      try {
        res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data, ...(payload !== undefined ? { payload } : {}) }),
        })
      } catch {
        const msg = 'Network error — please check your connection'
        setState((s) => ({ ...s, isPending: false, error: msg }))
        onError?.(msg)
        return
      }

      const result = (await res.json()) as ServerResponse

      setState((s) => ({ ...s, isPending: false }))

      if (!result.success) {
        if (result.fieldErrors) {
          // Map server field errors back into RHF so they show via FormField
          Object.entries(result.fieldErrors).forEach(([key, messages]) => {
            rhf.setError(key as string, { type: 'server', message: messages[0] ?? '' })
          })
          setState((s) => ({ ...s, fieldErrors: result.fieldErrors! }))
        } else {
          const msg = result.error ?? 'An unexpected error occurred'
          setState((s) => ({ ...s, error: msg }))
          onError?.(msg)
        }
        return
      }

      const data_ = result.data as TAction['_data']
      setState((s) => ({ ...s, data: data_ }))
      onSuccess?.(data_)
    },
    [endpoint, payload, rhf, onSuccess, onError],
  )

  // ---------------------------------------------------------------------------
  // handleSubmit — validates then POSTs
  // ---------------------------------------------------------------------------

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      void rhf.handleSubmit(async (formData) => {
        if (isMultiStep) {
          // Save last step data and send the full array
          stepDataRef.current[step] = formData
          await postToServer(stepDataRef.current)
        } else {
          await postToServer(formData)
        }
      })(e)
    },
    [rhf, isMultiStep, step, postToServer],
  )

  // ---------------------------------------------------------------------------
  // Multi-step navigation
  // ---------------------------------------------------------------------------

  const next = useCallback(async () => {
    if (!isMultiStep || step >= totalSteps - 1) return

    // Validate current step manually with Zod (RHF resolver validates on submit,
    // but for step advancement we want immediate validation without a form submit)
    const currentValues = rhf.getValues()
    const currentSchema = getStepSchema(schema, step)
    const result = currentSchema.safeParse(currentValues)

    if (!result.success) {
      // Push Zod errors into RHF so they render via FormField
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || (issue.path[0]?.toString() ?? '')
        rhf.setError(key, { type: 'validation', message: issue.message })
      }
      // Trigger RHF to re-render with errors
      await rhf.trigger()
      return
    }

    // Save this step's data and advance
    stepDataRef.current[step] = result.data
    setStep((s) => s + 1)
    rhf.reset() // Clear fields for the next step
    setState((s) => ({ ...s, fieldErrors: {} }))
  }, [isMultiStep, step, totalSteps, rhf, schema])

  const prev = useCallback(() => {
    if (!isMultiStep || step <= 0) return
    setStep((s) => s - 1)
    rhf.reset()
    setState((s) => ({ ...s, fieldErrors: {}, error: null }))
  }, [isMultiStep, step, rhf])

  // ---------------------------------------------------------------------------
  // Context value for FormField/FormArray
  // ---------------------------------------------------------------------------

  const ctx: SafeFormContextValue = {
    rhf: rhf as any,
    fieldErrors: state.fieldErrors,
    currentStep: step,
  }

  return {
    handleSubmit,
    state,
    _ctx: ctx,
    step,
    totalSteps,
    isFirstStep: step === 0,
    isLastStep: step === totalSteps - 1,
    next,
    prev,
    isMultiStep,
  }
}
