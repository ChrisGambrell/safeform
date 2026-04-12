import { createAction } from '@safeform/core'
import { z } from 'zod'

// Unnamed multi-step (z.tuple) — server receives flat merged data
export const onboardingSchema = z.tuple([
  z.object({ username: z.string().min(2, 'Username must be at least 2 characters') }),
  z.object({ bio: z.string().min(10, 'Bio must be at least 10 characters') }),
])

export type OnboardingAction = typeof onboardingAction

export const onboardingAction = createAction().create(
  { schema: onboardingSchema },
  (data) => {
    // data is the flat-merged result: { username, bio }
    return { success: true as const, data: { userId: 'user-' + Date.now(), ...data } }
  },
)
