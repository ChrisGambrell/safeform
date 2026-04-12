'use client'

import { useForm, SafeFormContext, FormField } from '@safeform/core'
import type { ContactAction } from '../api/contact/route'
import { contactSchema } from '../api/contact/schema'

export default function ContactPage() {
  const form = useForm<ContactAction>({
    endpoint: '/api/contact',
    schema: contactSchema,
  })

  return (
    <main>
      <h1>Contact Us</h1>

      {form.state.error && (
        <p data-testid="global-error" style={{ color: 'red' }}>
          {form.state.error}
        </p>
      )}

      {form.state.data && (
        <p data-testid="success-message" style={{ color: 'green' }}>
          Message received! We&apos;ll be in touch at{' '}
          {(form.state.data as { email: string }).email}.
        </p>
      )}

      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit} data-testid="contact-form" noValidate>
          <div style={{ marginBottom: '1rem' }}>
            <FormField name="email">
              {({ value, onChange, errors }) => (
                <div>
                  <label htmlFor="email">Email</label>
                  <br />
                  <input
                    id="email"
                    type="email"
                    data-testid="email-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '100%' }}
                  />
                  {errors?.map((e) => (
                    <span key={e} data-testid="email-error" style={{ color: 'red', fontSize: '0.875rem' }}>
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </FormField>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <FormField name="message">
              {({ value, onChange, errors }) => (
                <div>
                  <label htmlFor="message">Message</label>
                  <br />
                  <textarea
                    id="message"
                    data-testid="message-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    rows={4}
                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '100%' }}
                  />
                  {errors?.map((e) => (
                    <span key={e} data-testid="message-error" style={{ color: 'red', fontSize: '0.875rem' }}>
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </FormField>
          </div>

          <button
            type="submit"
            data-testid="submit-btn"
            disabled={form.state.isPending}
            style={{ padding: '0.5rem 1.5rem' }}
          >
            {form.state.isPending ? 'Sending…' : 'Send Message'}
          </button>
        </form>
      </SafeFormContext.Provider>
    </main>
  )
}
