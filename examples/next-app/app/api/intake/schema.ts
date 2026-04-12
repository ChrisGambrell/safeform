import { createSteps } from '@safeform/core'
import { z } from 'zod'

// Named multi-step (createSteps) — server receives namespaced data
export const intakeSchema = createSteps({
  personal: z.object({
    firstName: z.string().min(1, 'First name is required'),
    dob: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Enter a valid date (MM/DD/YYYY)'),
    phone: z.string().regex(/^\(\d{3}\) \d{3}-\d{4}$/, 'Enter a valid phone number'),
  }),
  vitals: z.object({ weight: z.string().min(1, 'Weight is required') }),
})
