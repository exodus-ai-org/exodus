import type { InstalledSkill } from '@exodus/shared/types/skills'
import { fetcher } from '@exodus/shared/utils/http'
import { useQuery } from '@tanstack/react-query'

import { INSTALLED_SKILLS_KEY } from '@/services/skills'

export const installedSkillsKeys = { all: ['installed-skills'] as const }

export function useInstalledSkills() {
  const { data, isLoading } = useQuery({
    queryKey: installedSkillsKeys.all,
    queryFn: () => fetcher<InstalledSkill[]>(INSTALLED_SKILLS_KEY)
  })
  return { data, isLoading }
}
