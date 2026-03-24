import { Settings } from '@shared/schemas/settings-schema'
import z from 'zod'

// Settings routes schemas
export const updateSettingsSchema = z.custom<Settings>()
