import { createRouteHandler } from '@safeform/next'
import { tagsAction } from '../../../actions/tags'

export const POST = createRouteHandler(tagsAction)
