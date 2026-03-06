import { Setting } from '@shared/schemas/setting-schema'
import z from 'zod'

// Setting routes schemas
export const updateSettingsSchema = z.custom<Setting>()
