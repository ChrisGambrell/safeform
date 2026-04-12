import { createAction } from 'safeform'
import { createSteps } from 'safeform'
import { z } from 'zod'

// Named multi-step (createSteps) — server receives namespaced data
export const intakeSchema = createSteps({
  personal: z.object({ firstName: z.string().min(1, 'First name is required') }),
  vitals: z.object({ weight: z.string().min(1, 'Weight is required') }),
})

export type IntakeAction = typeof intakeAction

export const intakeAction = createAction().create(
  { schema: intakeSchema },
  (data) => {
    // data is namespaced: { personal: { firstName }, vitals: { weight } }
    return { success: true as const, data: { patientId: 'pat-' + Date.now(), ...data } }
  },
)
