import { createAction } from '@safeform/core'
import { createRouteHandler } from '@safeform/next'
import { employeeSchema } from './schema'

// Simulate a taken name for E2E testing (no real DB needed)
const TAKEN_NAMES = ['taken@example.com', 'duplicate']

const employeeAction = createAction().create(
  { schema: employeeSchema },
  (data) => {
    if (TAKEN_NAMES.includes(data.name.toLowerCase())) {
      return { success: false as const, fieldErrors: { name: ['That name is already in use'] } }
    }
    return {
      success: true as const,
      data: { employeeId: 'emp-' + Date.now(), name: data.name, role: data.role },
    }
  },
)

export type EmployeeAction = typeof employeeAction
export const POST = createRouteHandler(employeeAction)
