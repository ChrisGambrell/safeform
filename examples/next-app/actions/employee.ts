import { createAction } from '@safeform/core'
import { z } from 'zod'

export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['Admin', 'Cashier', 'Janitor'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
})

export type EmployeeAction = typeof employeeAction

// Simulate a taken name for E2E testing (no real DB needed)
const TAKEN_NAMES = ['taken@example.com', 'duplicate']

export const employeeAction = createAction().create(
  { schema: employeeSchema },
  (data) => {
    if (TAKEN_NAMES.includes(data.name.toLowerCase())) {
      return { success: false as const, fieldErrors: { name: ['That name is already in use'] } }
    }
    // In a real app this would persist to a database
    return {
      success: true as const,
      data: { employeeId: 'emp-' + Date.now(), name: data.name, role: data.role },
    }
  },
)
