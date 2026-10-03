import skills from '../../seed/skills.json'
import roles from '../../seed/roles.json'
import { stackLayer } from '../db/schema'
import type { CatalogSeed, SkillSeed, StackLayer } from './directory'

// The repo's seed files, checked so a typo in a Stack Layer fails loudly.
export const starterCatalogs: CatalogSeed = {
  skills: skills.map(
    (skill): SkillSeed => ({
      ...skill,
      suggestedLayer: skill.suggestedLayer
        ? toStackLayer(skill.suggestedLayer, skill.name)
        : undefined,
    }),
  ),
  roles,
}

function toStackLayer(value: string, skillName: string): StackLayer {
  if (!(stackLayer.enumValues as readonly string[]).includes(value)) {
    throw new Error(`Unknown suggestedLayer "${value}" for Skill "${skillName}"`)
  }
  return value as StackLayer
}
