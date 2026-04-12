import { useCallback } from 'react'
import { useWatch } from 'react-hook-form'
import type { z } from 'zod'
import { useSafeFormContext } from './form-context.js'
import type { ArrayPaths, ArrayItemValue } from './paths.js'

// ---------------------------------------------------------------------------
// FormArray render prop types
// ---------------------------------------------------------------------------

export interface FormArrayRenderProps<TItem> {
  /** Current array items. Use index to render each item with FormField. */
  items: TItem[]
  /** Append a new item to the array */
  append: (value: TItem) => void
  /** Remove the item at the given index */
  remove: (index: number) => void
}

export interface FormArrayProps<
  TSchema extends z.ZodTypeAny,
  TPath extends ArrayPaths<TSchema>,
> {
  name: TPath
  children: (
    props: FormArrayRenderProps<ArrayItemValue<TSchema, TPath & string>>,
  ) => React.ReactNode
}

export interface FormArrayPropsUntyped {
  name: string
  children: (props: FormArrayRenderProps<unknown>) => React.ReactNode
}

// ---------------------------------------------------------------------------
// FormArray component
// ---------------------------------------------------------------------------

/**
 * Headless array field component. Reads from SafeFormContext.
 * The render prop receives `items`, `append`, and `remove`.
 *
 * @example
 * <FormArray name="tags">
 *   {({ items, append, remove }) => (
 *     <>
 *       {items.map((_, i) => (
 *         <FormField key={i} name={`tags.${i}`}>
 *           {({ value, onChange }) => (
 *             <div>
 *               <input value={value as string} onChange={e => onChange(e.target.value)} />
 *               <button type="button" onClick={() => remove(i)}>Remove</button>
 *             </div>
 *           )}
 *         </FormField>
 *       ))}
 *       <button type="button" onClick={() => append('')}>Add tag</button>
 *     </>
 *   )}
 * </FormArray>
 */
export function FormArray({ name, children }: FormArrayPropsUntyped) {
  const { rhf } = useSafeFormContext()

  // useWatch subscribes to changes and triggers re-renders when the array updates
  const watched = useWatch({ control: rhf.control, name }) as unknown[] | undefined
  const items = watched ?? []

  const append = useCallback(
    (value: unknown) => {
      const current = (rhf.getValues(name) as unknown[] | undefined) ?? []
      rhf.setValue(name, [...current, value], { shouldDirty: true })
    },
    [rhf, name],
  )

  const remove = useCallback(
    (index: number) => {
      const current = (rhf.getValues(name) as unknown[] | undefined) ?? []
      rhf.setValue(
        name,
        current.filter((_, i) => i !== index),
        { shouldDirty: true },
      )
    },
    [rhf, name],
  )

  return children({
    items,
    append: append as (value: unknown) => void,
    remove,
  }) as React.ReactElement
}
