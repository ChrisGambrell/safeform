'use client'

import { useForm, SafeFormContext, FormField, MaskedField } from '@safeform/core'
import type { IntakeAction } from '../api/intake/route'
import { intakeSchema } from '../api/intake/schema'

export default function IntakePage() {
  const form = useForm<IntakeAction>({
    endpoint: '/api/intake',
    schema: intakeSchema,
  })

  return (
    <main>
      <h1>Patient Intake</h1>
      <p data-testid="step-indicator">Step {form.step + 1} of {form.totalSteps}</p>

      {form.state.data && (
        <p data-testid="success-message">
          Intake complete! Patient ID: {(form.state.data as { patientId: string }).patientId}
        </p>
      )}

      <SafeFormContext.Provider value={form._ctx}>
        <form {...form.formProps} data-testid="intake-form">
          {form.step === 0 && (
            <div>
              <h2>Personal</h2>
              <FormField name="firstName">
                {({ value, onChange, errors }) => (
                  <div>
                    <label>First Name</label>
                    <input
                      data-testid="firstName-input"
                      value={(value as string) ?? ''}
                      onChange={(e) => onChange(e.target.value)}
                    />
                    {errors?.map((e) => (
                      <span key={e} data-testid="firstName-error">{e}</span>
                    ))}
                  </div>
                )}
              </FormField>

              <MaskedField name="dob" mask="date">
                {({ value, onChange, onKeyDown, onBlur, placeholder, maxLength, errors }) => (
                  <div>
                    <label>Date of Birth</label>
                    <input
                      data-testid="dob-input"
                      value={value}
                      onChange={onChange}
                      onKeyDown={onKeyDown}
                      onBlur={onBlur}
                      placeholder={placeholder}
                      maxLength={maxLength}
                    />
                    {errors.map((e) => (
                      <span key={e} data-testid="dob-error">{e}</span>
                    ))}
                  </div>
                )}
              </MaskedField>

              <MaskedField name="phone" mask="phone">
                {({ value, onChange, onKeyDown, onBlur, placeholder, maxLength, errors }) => (
                  <div>
                    <label>Phone</label>
                    <input
                      data-testid="phone-input"
                      value={value}
                      onChange={onChange}
                      onKeyDown={onKeyDown}
                      onBlur={onBlur}
                      placeholder={placeholder}
                      maxLength={maxLength}
                    />
                    {errors.map((e) => (
                      <span key={e} data-testid="phone-error">{e}</span>
                    ))}
                  </div>
                )}
              </MaskedField>
            </div>
          )}

          {form.step === 1 && (
            <div>
              <h2>Vitals</h2>
              <FormField name="weight">
                {({ value, onChange, errors }) => (
                  <div>
                    <label>Weight (lbs)</label>
                    <input
                      data-testid="weight-input"
                      value={(value as string) ?? ''}
                      onChange={(e) => onChange(e.target.value)}
                    />
                    {errors?.map((e) => (
                      <span key={e} data-testid="weight-error">{e}</span>
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
                {form.state.isPending ? 'Saving…' : 'Submit Intake'}
              </button>
            )}
          </div>
        </form>
      </SafeFormContext.Provider>
    </main>
  )
}
