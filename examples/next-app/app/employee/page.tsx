'use client'

import { useForm, SafeFormContext, FormField } from '@safeform/core'
import type { EmployeeAction } from '../../actions/employee'
import { employeeSchema } from '../../actions/employee'

export default function EmployeePage() {
  const form = useForm<EmployeeAction>({
    endpoint: '/api/employees',
    schema: employeeSchema,
  })

  return (
    <main>
      <h1>Add Employee</h1>

      {form.state.error && (
        <p data-testid="global-error" style={{ color: 'red' }}>
          {form.state.error}
        </p>
      )}

      {form.state.data && (
        <p data-testid="success-message" style={{ color: 'green' }}>
          Employee saved! ID: {(form.state.data as { employeeId: string }).employeeId}
        </p>
      )}

      <SafeFormContext.Provider value={form._ctx}>
        <form onSubmit={form.handleSubmit} data-testid="employee-form">
          <div style={{ marginBottom: '1rem' }}>
            <FormField name="name">
              {({ value, onChange, errors }) => (
                <div>
                  <label htmlFor="name">Name</label>
                  <br />
                  <input
                    id="name"
                    data-testid="name-input"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '100%' }}
                  />
                  {errors?.map((e) => (
                    <span key={e} data-testid="name-error" style={{ color: 'red', fontSize: '0.875rem' }}>
                      {e}
                    </span>
                  ))}
                </div>
              )}
            </FormField>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <FormField name="role">
              {({ value, onChange, errors }) => (
                <div>
                  <label htmlFor="role">Role</label>
                  <br />
                  <select
                    id="role"
                    data-testid="role-select"
                    value={(value as string) ?? ''}
                    onChange={(e) => onChange(e.target.value)}
                    style={{ display: 'block', marginTop: '0.25rem', padding: '0.5rem', width: '100%' }}
                  >
                    <option value="">Select a role…</option>
                    <option value="Admin">Admin</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Janitor">Janitor</option>
                  </select>
                  {errors?.map((e) => (
                    <span key={e} data-testid="role-error" style={{ color: 'red', fontSize: '0.875rem' }}>
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
            {form.state.isPending ? 'Saving…' : 'Save Employee'}
          </button>
        </form>
      </SafeFormContext.Provider>
    </main>
  )
}
