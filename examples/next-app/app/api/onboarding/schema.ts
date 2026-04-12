import { z } from 'zod'

// Unnamed multi-step (z.tuple) — server receives flat merged data
export const onboardingSchema = z.tuple([
  z.object({ username: z.string().min(2, 'Username must be at least 2 characters') }),
  z.object({ bio: z.string().min(10, 'Bio must be at least 10 characters') }),
])
