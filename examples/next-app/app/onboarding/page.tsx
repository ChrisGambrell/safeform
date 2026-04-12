'use client'

import { useForm, SafeFormContext, FormField } from 'safeform'
import type { OnboardingAction } from '../../actions/onboarding'
import { onboardingSchema } from '../../actions/onboarding'

export default function OnboardingPage() {
  const form = useForm<OnboardingAction>({
    endpoint: '/api/onboarding',
    schema: onboardingSchema,
  })

  return (
    <main>
      <h1>Onboarding</h1>
      <p data-testid="step-indicator">Step {form.step + 1} of {form.totalSteps}</p>

      {form.state.data && (
        <p data-testid="success-message">
          Welcome! User ID: {(form.state.data as { userId: string }).userId}
        </p>
      )}

      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit} data-testid="onboarding-form" noValidate>
          {form.step === 0 && (
            <div>
              <FormField name="username">
                {({ value, onChange, errors }) => (
                  <div>
                    <label>Username</label>
                    <input
                      data-testid="username-input"
                      value={(value as string) ?? ''}
                      onChange={(e) => onChange(e.target.value)}
                    />
                    {errors?.map((e) => (
                      <span key={e} data-testid="username-error">{e}</span>
                    ))}
                  </div>
                )}
              </FormField>
            </div>
          )}

          {form.step === 1 && (
            <div>
              <FormField name="bio">
                {({ value, onChange, errors }) => (
                  <div>
                    <label>Bio</label>
                    <textarea
                      data-testid="bio-input"
                      value={(value as string) ?? ''}
                      onChange={(e) => onChange(e.target.value)}
                    />
                    {errors?.map((e) => (
                      <span key={e} data-testid="bio-error">{e}</span>
                    ))}
                  </div>
                )}
              </FormField>
            </div>
          )}

          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            {!form.isFirstStep && (
              <button type="button" data-testid="prev-btn" onClick={() => form.prev()}>
                Back
              </button>
            )}
            {!form.isLastStep && (
              <button type="button" data-testid="next-btn" onClick={() => void form.next()}>
                Next
              </button>
            )}
            {form.isLastStep && (
              <button type="submit" data-testid="submit-btn" disabled={form.state.isPending}>
                {form.state.isPending ? 'Saving…' : 'Finish'}
              </button>
            )}
          </div>
        </form>
      </SafeFormContext.Provider>
    </main>
  )
}
