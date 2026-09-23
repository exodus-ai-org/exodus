import {
  conditionNameOf,
  type WeatherConditionName
} from '@exodus/shared/types/weather'
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  type LucideIcon
} from 'lucide-react'

/**
 * A weather code (WMO from Open-Meteo, or wttr.in's WWO on old rows) → the
 * icon that stands for it. The icon's tint is the one place the condition
 * gets a colour: the card itself is tokens only, and the curve follows the
 * colour tone's accent (`primary`).
 */
export interface Condition {
  Icon: LucideIcon
  tint: string
}

const CONDITIONS: Record<WeatherConditionName, Condition> = {
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

/** A clear or partly cloudy night is a moon, not a sun. */
const NIGHT: Partial<Record<WeatherConditionName, Condition>> = {
  Sunny: { Icon: Moon, tint: 'text-muted-foreground' },
  PartlyCloudy: { Icon: CloudMoon, tint: 'text-muted-foreground' }
}

export function conditionOf(weatherCode: string, isDay = true): Condition {
  const name = conditionNameOf(weatherCode)
  return (isDay ? undefined : NIGHT[name]) ?? CONDITIONS[name]
}
