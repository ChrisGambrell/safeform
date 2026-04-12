import { createRouteHandler } from '@safeform/next'
import { employeeAction } from '../../../actions/employee'

const handler = createRouteHandler(employeeAction)

export { handler as POST }
