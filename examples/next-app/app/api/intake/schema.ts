import { createSteps, MASK_SCHEMAS } from '@safeform/core'
import { z } from 'zod'

// Named multi-step (createSteps) — server receives namespaced data
export const intakeSchema = createSteps({
  personal: z.object({
    firstName: z.string().min(1, 'First name is required'),
    dob:       MASK_SCHEMAS.date,
    phone:     MASK_SCHEMAS.phone,
  }),
  vitals: z.object({ weight: z.string().min(1, 'Weight is required') }),
})
