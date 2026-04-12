import { createAction } from '@safeform/core'
import { createRouteHandler } from '@safeform/next'
import { onboardingSchema } from './schema'

const onboardingAction = createAction().create(
  { schema: onboardingSchema },
  (data) => {
    // data is the flat-merged result: { username, bio }
    return { success: true as const, data: { userId: 'user-' + Date.now(), ...data } }
  },
)

export type OnboardingAction = typeof onboardingAction
export const POST = createRouteHandler(onboardingAction)
