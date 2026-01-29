import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional()
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export const connectFbSchema = z.object({
  userAccessToken: z.string().min(10)
})

export const scheduleTextSchema = z.object({
  pageId: z.string().min(3),
  message: z.string().min(1),
  scheduledAt: z.string().min(8)
})
