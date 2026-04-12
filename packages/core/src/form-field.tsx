'use client'
import { useController } from 'react-hook-form'
import type { z } from 'zod'
import { useSafeFormContext } from './form-context.js'
import type { ZodPaths, ZodPathValue } from './paths.js'

// ---------------------------------------------------------------------------
// FormField render prop types
// ---------------------------------------------------------------------------

export interface FormFieldRenderProps<TValue> {
  value: TValue
  onChange: (value: TValue) => void
  onBlur: () => void
  /** Combined client + server errors for this field. undefined when no errors. */
  errors: string[] | undefined
  name: string
}

export interface FormFieldProps<
  TSchema extends z.ZodTypeAny,
  TPath extends ZodPaths<TSchema>,
> {
  name: TPath
  children: (props: FormFieldRenderProps<ZodPathValue<TSchema, TPath & string>>) => React.ReactNode
}

// ---------------------------------------------------------------------------
// Untyped variant — used internally and by users who opt out of path typing
// ---------------------------------------------------------------------------

export interface FormFieldPropsUntyped {
  name: string
  children: (props: FormFieldRenderProps<unknown>) => React.ReactNode
}

// ---------------------------------------------------------------------------
// FormField component
// ---------------------------------------------------------------------------

/**
 * Headless field component. Reads from SafeFormContext (established by useForm).
 * The render prop receives `value`, `onChange`, `onBlur`, and `errors`.
 *
 * @example
 * <FormField name="firstName">
 *   {({ value, onChange, onBlur, errors }) => (
 *     <div>
 *       <input value={value as string} onChange={e => onChange(e.target.value)} onBlur={onBlur} />
 *       {errors?.map(e => <p key={e}>{e}</p>)}
 *     </div>
 *   )}
 * </FormField>
 *
 * // Nested object — dot notation
 * <FormField name="address.city">
 *   {({ value, onChange }) => <input value={value as string} onChange={e => onChange(e.target.value)} />}
 * </FormField>
 */
export function FormField({ name, children }: FormFieldPropsUntyped) {
  const { rhf, fieldErrors } = useSafeFormContext()

  const { field, fieldState } = useController({
    name,
    control: rhf.control,
    defaultValue: undefined,
  })

  // Prefer server-returned field errors; fall back to client validation errors
  const serverErrors = fieldErrors[name]
  const clientError = fieldState.error?.message
  const errors: string[] | undefined =
    serverErrors && serverErrors.length > 0
      ? serverErrors
      : clientError
        ? [clientError]
        : undefined

  return children({
    value: field.value as unknown,
    onChange: field.onChange as (value: unknown) => void,
    onBlur: field.onBlur,
    errors,
    name: field.name,
  }) as React.ReactElement
}
