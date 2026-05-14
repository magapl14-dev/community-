import { z } from 'zod'
import { FIELD_LIMITS } from '../constants/index.js'

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
})
export type LoginInput = z.infer<typeof loginSchema>

export const telegramAuthSchema = z.object({
  id: z.number().int().positive(),
  first_name: z.string().min(1),
  last_name: z.string().optional(),
  username: z.string().optional(),
  photo_url: z.string().url().optional(),
  auth_date: z.number().int().positive(),
  hash: z.string().length(64),
})
export type TelegramAuthInput = z.infer<typeof telegramAuthSchema>

export const applicationSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional(),
  telegram: z.string().max(50).optional(),
  position: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  revenueRange: z.string().max(50).optional(),
  motivation: z.string().max(FIELD_LIMITS.motivation).optional(),
  captchaToken: z.string().min(1),
  consent: z.literal(true),
})
export type ApplicationInput = z.infer<typeof applicationSchema>

export const updateMemberSchema = z.object({
  position: z.string().max(100).optional(),
  company: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
  city: z.string().max(50).optional(),
  bio: z.string().max(FIELD_LIMITS.bio).optional(),
  lookingFor: z.string().max(FIELD_LIMITS.lookingFor).optional(),
  canHelpWith: z.string().max(FIELD_LIMITS.canHelpWith).optional(),
  telegramUsername: z.string().max(50).optional(),
  phone: z.string().max(20).optional(),
  skills: z.array(z.string().max(30)).max(20).optional(),
  isPublic: z.boolean().optional(),
})
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(10_000).optional(),
  format: z.enum(['offline', 'online', 'hybrid']).default('offline'),
  startAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  location: z.string().max(300).optional(),
  capacity: z.number().int().positive().optional(),
  coverUrl: z.string().url().optional(),
  isMembersOnly: z.boolean().default(true),
})
export type CreateEventInput = z.infer<typeof createEventSchema>

export const createNewsSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().max(20_000).optional(),
  type: z.enum(['news', 'announcement', 'pinned']).default('news'),
  isPinned: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
})
export type CreateNewsInput = z.infer<typeof createNewsSchema>

export const pushTokenSchema = z.object({
  token: z.string().min(10).max(500),
  platform: z.enum(['ios', 'android']),
  appVersion: z.string().max(20).optional(),
})
export type PushTokenInput = z.infer<typeof pushTokenSchema>

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const membersQuerySchema = paginationSchema.extend({
  search: z.string().max(100).optional(),
  industry: z.string().max(100).optional(),
})
