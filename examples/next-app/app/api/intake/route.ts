import { createRouteHandler } from '@safeform/next'
import { intakeAction } from '../../../actions/intake'

export const POST = createRouteHandler(intakeAction)
