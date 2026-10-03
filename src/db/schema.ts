import { integer, pgEnum, pgTable, serial, text } from 'drizzle-orm/pg-core'

export const stackLayer = pgEnum('stack_layer', [
  'frontendFramework',
  'backendFramework',
  'backendLanguage',
  'database',
])

// `normalizedName` is the lookup key for Alias resolution: see `normalizeName`.
export const skills = pgTable('skills', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
  suggestedLayer: stackLayer('suggested_layer'),
})

export const skillAliases = pgTable('skill_aliases', {
  id: serial('id').primaryKey(),
  skillId: integer('skill_id')
    .notNull()
    .references(() => skills.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
})

export const targetRoles = pgTable('target_roles', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
})

export const targetRoleAliases = pgTable('target_role_aliases', {
  id: serial('id').primaryKey(),
  targetRoleId: integer('target_role_id')
    .notNull()
    .references(() => targetRoles.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull().unique(),
})
