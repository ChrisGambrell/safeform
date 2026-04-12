import { createAction } from 'safeform'
import { z } from 'zod'

export const tagsSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).min(1, 'Add at least one tag'),
})

export type TagsAction = typeof tagsAction

export const tagsAction = createAction().create(
  { schema: tagsSchema },
  (data) => {
    return { success: true as const, data: { saved: true, title: data.title, tags: data.tags } }
  },
)
