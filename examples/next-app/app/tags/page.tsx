'use client'

import { useForm, SafeFormContext, FormField, FormArray } from '@safeform/core'
import type { TagsAction } from '../api/tags/route'
import { tagsSchema } from '../api/tags/schema'

export default function TagsPage() {
  const form = useForm<TagsAction>({
    endpoint: '/api/tags',
    schema: tagsSchema,
  })

  return (
    <main>
      <h1>Tag Editor</h1>

      {form.state.data && (
        <p data-testid="success-message">
          Saved! Tags: {(form.state.data as { tags: string[] }).tags.join(', ')}
        </p>
      )}

      <SafeFormContext.Provider value={form._ctx}>
        <form {...form.formProps} data-testid="tags-form">
          <div style={{ marginBottom: '1rem' }}>
            <FormField name="title">
              {({ value, onChange, errors }) => (
                <div>
                  <label>Title</label>
                  <input
                    data-testid="title-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                  />
                  {errors?.map((e) => (
                    <span key={e} data-testid="title-error">{e}</span>
                  ))}
                </div>
              )}
            </FormField>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label>Tags</label>
            <FormArray name="tags">
              {({ items, append, remove }) => (
                <div>
                  {items.map((_, i) => (
                    <FormField key={i} name={`tags.${i}`}>
                      {({ value, onChange, errors }) => (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <input
                            data-testid={`tag-input-${i}`}
                            value={(value as string) ?? ''}
                            onChange={(e) => onChange(e.target.value)}
                            placeholder={`Tag ${i + 1}`}
                          />
                          <button
                            type="button"
                            data-testid={`remove-tag-${i}`}
                            onClick={() => remove(i)}
                          >
                            Remove
                          </button>
                          {errors?.map((e) => (
                            <span key={e} data-testid={`tag-error-${i}`}>{e}</span>
                          ))}
                        </div>
                      )}
                    </FormField>
                  ))}
                  <button
                    type="button"
                    data-testid="add-tag-btn"
                    onClick={() => append('')}
                    style={{ marginTop: '0.5rem' }}
                  >
                    + Add Tag
                  </button>
                </div>
              )}
            </FormArray>
          </div>

          <button type="submit" data-testid="submit-btn" disabled={form.state.isPending}>
            {form.state.isPending ? 'Saving…' : 'Save'}
          </button>
        </form>
      </SafeFormContext.Provider>
    </main>
  )
}
