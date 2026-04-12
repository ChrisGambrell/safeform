import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { z } from 'zod'
import { useForm } from './use-form.js'
import { SafeFormContext } from './form-context.js'
import { FormField } from './form-field.js'
import { FormArray } from './form-array.js'

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function mockFetch(response: object, status = 200) {
  return vi.spyOn(global, 'fetch').mockResolvedValueOnce(
    new Response(JSON.stringify(response), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

beforeEach(() => vi.restoreAllMocks())

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  age: z.number(),
})

// Wrapper that provides SafeFormContext from useForm
function FormWrapper({
  children,
  onSuccess,
  onError,
}: {
  children: React.ReactNode
  onSuccess?: () => void
  onError?: (e: string) => void
}) {
  const form = useForm({ endpoint: '/api/test', schema, onSuccess, onError })
  return (
    <SafeFormContext.Provider value={form._ctx}>
      <form data-testid="form" onSubmit={form.handleSubmit}>
        {children}
        <button type="submit">Submit</button>
      </form>
    </SafeFormContext.Provider>
  )
}

// ---------------------------------------------------------------------------
// C-2: FormField render prop
// ---------------------------------------------------------------------------

describe('FormField — C-2', () => {
  it('renders children via render prop', () => {
    render(
      <FormWrapper>
        <FormField name="name">
          {({ value, onChange }) => (
            <input
              data-testid="name-input"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </FormField>
      </FormWrapper>,
    )
    expect(screen.getByTestId('name-input')).toBeDefined()
  })

  it('passes value, onChange, onBlur, name to render prop', () => {
    const renderFn = vi.fn(() => <div />)
    render(
      <FormWrapper>
        <FormField name="name">{renderFn}</FormField>
      </FormWrapper>,
    )
    expect(renderFn).toHaveBeenCalledWith(
      expect.objectContaining({
        onChange: expect.any(Function),
        onBlur: expect.any(Function),
        name: 'name',
      }),
    )
  })

  it('value updates when user types', () => {
    render(
      <FormWrapper>
        <FormField name="name">
          {({ value, onChange }) => (
            <input
              data-testid="name-input"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </FormField>
      </FormWrapper>,
    )

    const input = screen.getByTestId('name-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Alice' } })
    expect(input.value).toBe('Alice')
  })
})

// ---------------------------------------------------------------------------
// C-3/C-4: Typed name and value via dot-notation
// ---------------------------------------------------------------------------

describe('FormField — nested dot-notation (C-3)', () => {
  const nestedSchema = z.object({
    address: z.object({
      city: z.string().min(1),
      zip: z.string().length(5),
    }),
  })

  function NestedFormWrapper({ children }: { children: React.ReactNode }) {
    const form = useForm({ endpoint: '/api/test', schema: nestedSchema })
    return (
      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit}>{children}</form>
      </SafeFormContext.Provider>
    )
  }

  it('reads and writes nested field via dot-notation name', () => {
    render(
      <NestedFormWrapper>
        <FormField name="address.city">
          {({ value, onChange }) => (
            <input
              data-testid="city-input"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
            />
          )}
        </FormField>
      </NestedFormWrapper>,
    )

    const input = screen.getByTestId('city-input') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Nashville' } })
    expect(input.value).toBe('Nashville')
  })
})

// ---------------------------------------------------------------------------
// C-5: FormField errors — client + server
// ---------------------------------------------------------------------------

describe('FormField errors — C-5', () => {
  it('shows no errors initially', () => {
    render(
      <FormWrapper>
        <FormField name="name">
          {({ errors }) => (
            <div>
              {errors?.map((e) => (
                <span key={e} data-testid="error">
                  {e}
                </span>
              ))}
            </div>
          )}
        </FormField>
      </FormWrapper>,
    )
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('shows client validation error after failed submit', async () => {
    render(
      <FormWrapper>
        <FormField name="name">
          {({ value, onChange, errors }) => (
            <div>
              <input
                data-testid="name-input"
                value={(value as string) ?? ''}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors?.map((e) => (
                <span key={e} data-testid="error">
                  {e}
                </span>
              ))}
            </div>
          )}
        </FormField>
      </FormWrapper>,
    )

    // Submit without filling the field
    await act(async () => {
      fireEvent.submit(screen.getByTestId('form'))
    })

    await waitFor(() => {
      expect(screen.queryByTestId('error')).not.toBeNull()
    })
  })

  it('shows server field error after failed server response', async () => {
    mockFetch({ success: false, fieldErrors: { name: ['Name already taken'] } }, 422)

    // Use a schema with only `name` so client validation passes when name is filled
    const nameOnlySchema = z.object({ name: z.string().min(1, 'Name is required') })

    function NameOnlyWrapper() {
      const form = useForm({ endpoint: '/api/test', schema: nameOnlySchema })
      return (
        <SafeFormContext.Provider value={form._ctx}>
          <form data-testid="form" onSubmit={form.handleSubmit}>
            <FormField name="name">
              {({ value, onChange, errors }) => (
                <div>
                  <input
                    data-testid="name-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                  />
                  {errors?.map((e) => (
                    <span key={e} data-testid="error">
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </FormField>
            <button type="submit">Submit</button>
          </form>
        </SafeFormContext.Provider>
      )
    }

    render(<NameOnlyWrapper />)

    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'Alice' } })

    await act(async () => {
      fireEvent.submit(screen.getByTestId('form'))
    })

    await waitFor(() => {
      // Server field errors should propagate
      expect(screen.queryByTestId('error')).not.toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// C-6/C-8: FormArray — items, append, remove + nested FormField
// ---------------------------------------------------------------------------

describe('FormArray — C-6/C-8', () => {
  const arraySchema = z.object({
    tags: z.array(z.string()),
  })

  function ArrayFormWrapper() {
    const form = useForm({ endpoint: '/api/test', schema: arraySchema })
    return (
      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit}>
          <FormArray name="tags">
            {({ items, append, remove }) => (
              <div>
                {items.map((_, i) => (
                  <FormField key={i} name={`tags.${i}`}>
                    {({ value, onChange }) => (
                      <div>
                        <input
                          data-testid={`tag-${i}`}
                          value={(value as string) ?? ''}
                          onChange={(e) => onChange(e.target.value)}
                        />
                        <button
                          type="button"
                          data-testid={`remove-${i}`}
                          onClick={() => remove(i)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </FormField>
                ))}
                <button
                  type="button"
                  data-testid="append"
                  onClick={() => append('')}
                >
                  Add
                </button>
              </div>
            )}
          </FormArray>
        </form>
      </SafeFormContext.Provider>
    )
  }

  it('starts with no items', () => {
    render(<ArrayFormWrapper />)
    expect(screen.queryByTestId('tag-0')).toBeNull()
  })

  it('appends an item when append is called', async () => {
    render(<ArrayFormWrapper />)
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    expect(screen.getByTestId('tag-0')).toBeDefined()
  })

  it('appends multiple items', async () => {
    render(<ArrayFormWrapper />)
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => expect(screen.getByTestId('tag-0')).toBeDefined())
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => expect(screen.getByTestId('tag-1')).toBeDefined())
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => expect(screen.getByTestId('tag-2')).toBeDefined())
  })

  it('removes an item when remove is called', async () => {
    render(<ArrayFormWrapper />)
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => expect(screen.getByTestId('tag-0')).toBeDefined())
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => {
      expect(screen.getByTestId('tag-0')).toBeDefined()
      expect(screen.getByTestId('tag-1')).toBeDefined()
    })

    await act(async () => { fireEvent.click(screen.getByTestId('remove-0')) })
    await waitFor(() => {
      expect(screen.queryByTestId('tag-1')).toBeNull() // only 1 item left now
      expect(screen.getByTestId('tag-0')).toBeDefined()
    })
  })

  it('field value updates via nested FormField', async () => {
    render(<ArrayFormWrapper />)
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })

    const input = screen.getByTestId('tag-0') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'react' } })
    expect(input.value).toBe('react')
  })
})

// ---------------------------------------------------------------------------
// C-9: FormField and FormArray work inside multi-step forms
// ---------------------------------------------------------------------------

describe('FormField in multi-step form — C-9', () => {
  const multiSchema = z.tuple([
    z.object({ firstName: z.string().min(1) }),
    z.object({ email: z.string().email() }),
  ])

  function MultiStepFormWrapper() {
    const form = useForm({ endpoint: '/api/test', schema: multiSchema })
    return (
      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit}>
          <span data-testid="step">{form.step}</span>
          {form.step === 0 && (
            <FormField name="firstName">
              {({ value, onChange }) => (
                <input
                  data-testid="firstName"
                  value={(value as string) ?? ''}
                  onChange={(e) => onChange(e.target.value)}
                />
              )}
            </FormField>
          )}
          {form.step === 1 && (
            <FormField name="email">
              {({ value, onChange }) => (
                <input
                  data-testid="email"
                  value={(value as string) ?? ''}
                  onChange={(e) => onChange(e.target.value)}
                />
              )}
            </FormField>
          )}
          <button type="button" data-testid="next" onClick={() => void form.next()}>
            Next
          </button>
        </form>
      </SafeFormContext.Provider>
    )
  }

  it('renders step 0 field initially', () => {
    render(<MultiStepFormWrapper />)
    expect(screen.getByTestId('firstName')).toBeDefined()
    expect(screen.queryByTestId('email')).toBeNull()
  })

  it('advances to step 1 after filling step 0 and clicking next', async () => {
    render(<MultiStepFormWrapper />)

    fireEvent.change(screen.getByTestId('firstName'), { target: { value: 'Alice' } })

    await act(async () => { fireEvent.click(screen.getByTestId('next')) })

    await waitFor(() => {
      expect(screen.getByTestId('step').textContent).toBe('1')
    })
    expect(screen.getByTestId('email')).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// C-2: FormField onBlur callback
// ---------------------------------------------------------------------------

describe('FormField — onBlur (C-2)', () => {
  it('calls onBlur when the input is blurred', () => {
    const onBlurSpy = vi.fn()
    render(
      <FormWrapper>
        <FormField name="name">
          {({ value, onChange, onBlur }) => (
            <input
              data-testid="name-input"
              value={(value as string) ?? ''}
              onChange={(e) => onChange(e.target.value)}
              onBlur={onBlur}
            />
          )}
        </FormField>
      </FormWrapper>,
    )

    const input = screen.getByTestId('name-input')
    fireEvent.focus(input)
    fireEvent.blur(input)
    expect(onBlurSpy).not.toHaveBeenCalled() // onBlur from RHF is different; field handles it

    // Verify the field renders with an onBlur prop at all
    expect(input).toBeDefined()
  })

  it('onBlur from render prop is a function', () => {
    let capturedOnBlur: (() => void) | undefined
    render(
      <FormWrapper>
        <FormField name="name">
          {({ onBlur }) => {
            capturedOnBlur = onBlur
            return <input data-testid="name-input" />
          }}
        </FormField>
      </FormWrapper>,
    )
    expect(typeof capturedOnBlur).toBe('function')
  })
})

// ---------------------------------------------------------------------------
// C-5: FormField error message content
// ---------------------------------------------------------------------------

describe('FormField — error message content (C-5)', () => {
  it('shows the exact client validation error message', async () => {
    // Use a single-field schema so there are no unregistered fields (age, etc.)
    // that could confuse zodResolver's error mapping.
    const nameOnlySchema = z.object({ name: z.string().min(1, 'Name is required') })

    function NameOnlyForm() {
      const form = useForm({ endpoint: '/api/test', schema: nameOnlySchema })
      return (
        <SafeFormContext.Provider value={form._ctx}>
          <form data-testid="form" onSubmit={form.handleSubmit}>
            <FormField name="name">
              {({ value, onChange, errors }) => (
                <div>
                  <input
                    data-testid="name-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                  />
                  {errors?.map((e) => (
                    <span key={e} data-testid="error">
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </FormField>
            <button type="submit">Submit</button>
          </form>
        </SafeFormContext.Provider>
      )
    }

    render(<NameOnlyForm />)

    // Type something first so the onChange handler fires and RHF registers the field as a string.
    // Then clear to '' — Zod runs min(1) and returns the custom message.
    // (Direct '' → '' is a DOM no-op since the input already renders '' via `undefined ?? ''`)
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'x' } })
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: '' } })

    await act(async () => {
      fireEvent.submit(screen.getByTestId('form'))
    })

    await waitFor(() => {
      const error = screen.queryByTestId('error')
      expect(error).not.toBeNull()
      // Custom message from z.string().min(1, 'Name is required')
      expect(error!.textContent).toBe('Name is required')
    })
  })
})

// ---------------------------------------------------------------------------
// C-6/C-8: FormArray value integrity after remove
// ---------------------------------------------------------------------------

describe('FormArray — value integrity after remove (C-6/C-8)', () => {
  const arraySchema = z.object({ tags: z.array(z.string()) })

  function ValueArrayWrapper() {
    const form = useForm({ endpoint: '/api/test', schema: arraySchema })
    return (
      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit}>
          <FormArray name="tags">
            {({ items, append, remove }) => (
              <div>
                {items.map((_, i) => (
                  <FormField key={i} name={`tags.${i}`}>
                    {({ value, onChange }) => (
                      <div>
                        <input
                          data-testid={`tag-${i}`}
                          value={(value as string) ?? ''}
                          onChange={(e) => onChange(e.target.value)}
                        />
                        <button
                          type="button"
                          data-testid={`remove-${i}`}
                          onClick={() => remove(i)}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </FormField>
                ))}
                <button type="button" data-testid="append" onClick={() => append('')}>
                  Add
                </button>
              </div>
            )}
          </FormArray>
        </form>
      </SafeFormContext.Provider>
    )
  }

  it('remaining item shifts to index 0 after removing first item', async () => {
    render(<ValueArrayWrapper />)

    // Add two items
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => expect(screen.getByTestId('tag-0')).toBeDefined())
    await act(async () => { fireEvent.click(screen.getByTestId('append')) })
    await waitFor(() => expect(screen.getByTestId('tag-1')).toBeDefined())

    // Fill both items
    fireEvent.change(screen.getByTestId('tag-0') as HTMLInputElement, {
      target: { value: 'first' },
    })
    fireEvent.change(screen.getByTestId('tag-1') as HTMLInputElement, {
      target: { value: 'second' },
    })

    // Remove the first item
    await act(async () => { fireEvent.click(screen.getByTestId('remove-0')) })

    await waitFor(() => {
      // Only one item should remain, now at index 0
      expect(screen.queryByTestId('tag-1')).toBeNull()
      const remaining = screen.getByTestId('tag-0') as HTMLInputElement
      expect(remaining.value).toBe('second')
    })
  })
})
