import { createAction } from '@safeform/core'
import { createRouteHandler } from '@safeform/next'
import { tagsSchema } from './schema'

const tagsAction = createAction().create(
  { schema: tagsSchema },
  (data) => {
    return { success: true as const, data: { saved: true, title: data.title, tags: data.tags } }
  },
)

export type TagsAction = typeof tagsAction
export const POST = createRouteHandler(tagsAction)
