import { WWO_CODE } from '@exodus/shared/types/weather'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  type LucideIcon
} from 'lucide-react'

/**
 * A wttr.in weather code → the icon that stands for it. The icon's tint is
 * the one place the condition gets a colour: the card itself is tokens
 * only, and the curve's wash borrows the tint at 14%.
 */
export interface Condition {
  Icon: LucideIcon
  tint: string
}

const CONDITIONS: Record<string, Condition> = {
  Sunny: { Icon: Sun, tint: 'text-amber-500' },
  PartlyCloudy: { Icon: CloudSun, tint: 'text-amber-500/80' },
  Cloudy: { Icon: Cloud, tint: 'text-muted-foreground' },
  VeryCloudy: { Icon: Cloud, tint: 'text-muted-foreground' },
  Fog: { Icon: CloudFog, tint: 'text-muted-foreground' },
  LightShowers: { Icon: CloudDrizzle, tint: 'text-sky-500' },
  LightSleetShowers: { Icon: CloudDrizzle, tint: 'text-sky-500' },
  LightSleet: { Icon: CloudSnow, tint: 'text-sky-400' },
  LightSnow: { Icon: CloudSnow, tint: 'text-sky-400' },
  LightSnowShowers: { Icon: CloudSnow, tint: 'text-sky-400' },
  HeavySnow: { Icon: CloudSnow, tint: 'text-sky-400' },
  HeavySnowShowers: { Icon: CloudSnow, tint: 'text-sky-400' },
  LightRain: { Icon: CloudRain, tint: 'text-sky-500' },
  HeavyShowers: { Icon: CloudRain, tint: 'text-sky-600' },
  HeavyRain: { Icon: CloudRain, tint: 'text-sky-600' },
  ThunderyShowers: { Icon: CloudLightning, tint: 'text-violet-500' },
  ThunderyHeavyRain: { Icon: CloudLightning, tint: 'text-violet-500' },
  ThunderySnowShowers: { Icon: CloudLightning, tint: 'text-violet-500' }
}

export function conditionOf(weatherCode: string): Condition {
  const name = WWO_CODE[weatherCode as keyof typeof WWO_CODE] ?? 'Cloudy'
  return CONDITIONS[name] ?? CONDITIONS.Cloudy
}
