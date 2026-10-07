import { TEST_IDS } from '@exodus/shared/constants/test-ids'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useDevices } from '@/hooks/use-devices'
import { isPhoneOnline } from '@/lib/phone-presence'
import { cn } from '@/lib/utils'

/** How often the window is re-read against the clock: a phone that went quiet greys out within a minute of the window's end. */
const TICK_MS = 60_000

/**
 * The paired-phone dot (spec 2026-10-08 §6): green when a paired phone
 * called the computer in the last five minutes, grey otherwise. The devices
 * list is re-read once a minute while the dot is on screen (the phone's
 * visits happen without this window's involvement — the owner's phone read
 * as gone while it was there, 2026-10-08), and on window focus. The clock is
 * re-read on a tick of its own: a poll that brings the same list back is the
 * same object (structural sharing) and renders nothing, so without the tick a
 * phone that went quiet stayed green (owner, 2026-10-08). Click opens
 * Settings › Devices.
 */
export function PhoneDot() {
  const { t } = useTranslation('chat')
  const navigate = useNavigate()
  const { data } = useDevices({ watchPresence: true })
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [])
  const online = isPhoneOnline(data, now)
  const label = online ? t('header.phonePaired') : t('header.phoneNotPaired')

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="no-drag hover:bg-accent flex size-7 shrink-0 items-center justify-center rounded-md"
            aria-label={label}
            data-testid={TEST_IDS.chat.header.phone}
            data-online={online ? 'true' : 'false'}
            onClick={() => navigate('/settings?tab=devices')}
          />
        }
      >
        <span
          className={cn(
            'size-2.5 rounded-full',
            online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
