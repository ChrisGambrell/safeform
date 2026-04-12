import { z } from 'zod'

export const employeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['Admin', 'Cashier', 'Janitor'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
})
