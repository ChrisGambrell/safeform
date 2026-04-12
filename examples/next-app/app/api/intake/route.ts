import { createAction } from '@safeform/core'
import { createRouteHandler } from '@safeform/next'
import { intakeSchema } from './schema'

const intakeAction = createAction().create(
  { schema: intakeSchema },
  (data) => {
    // data is namespaced: { personal: { firstName }, vitals: { weight } }
    return { success: true as const, data: { patientId: 'pat-' + Date.now(), ...data } }
  },
)

export type IntakeAction = typeof intakeAction
export const POST = createRouteHandler(intakeAction)
