import { createSteps } from '@safeform/core'
import { z } from 'zod'

// Named multi-step (createSteps) — server receives namespaced data
export const intakeSchema = createSteps({
  personal: z.object({ firstName: z.string().min(1, 'First name is required') }),
  vitals: z.object({ weight: z.string().min(1, 'Weight is required') }),
})
