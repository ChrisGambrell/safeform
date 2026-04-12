import { createRouteHandler } from '@safeform/next'
import { contactAction } from '../../../actions/contact'

const handler = createRouteHandler(contactAction)

export { handler as POST }
