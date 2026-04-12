import { createAction } from '@safeform/core'
import { z } from 'zod'

export const contactSchema = z.object({
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export type ContactAction = typeof contactAction

export const contactAction = createAction().create(
  { schema: contactSchema },
  (data) => {
    // No auth required — public action
    return { success: true as const, data: { received: true, email: data.email } }
  },
)
