import { createAction } from '@safeform/core'
import { createRouteHandler } from '@safeform/next'
import { contactSchema } from './schema'

const contactAction = createAction().create(
  { schema: contactSchema },
  (data) => {
    // No auth required — public action
    return { success: true as const, data: { received: true, email: data.email } }
  },
)

export type ContactAction = typeof contactAction
export const POST = createRouteHandler(contactAction)
