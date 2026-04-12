import { createRouteHandler } from '@safeform/next'
import { onboardingAction } from '../../../actions/onboarding'

export const POST = createRouteHandler(onboardingAction)
