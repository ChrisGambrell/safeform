import { z } from 'zod'

export const tagsSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  tags: z.array(z.string().min(1, 'Tag cannot be empty')).min(1, 'Add at least one tag'),
})
