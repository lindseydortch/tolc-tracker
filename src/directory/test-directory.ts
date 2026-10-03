import { PGlite } from '@electric-sql/pglite'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../db/schema'
import { createDirectory, type MemberLink } from './directory'
import {
  DiscordUnavailableError,
  type MembershipChecker,
} from './membership-checker'

// A Directory backed by a fresh in-memory Postgres with production migrations.
export async function createTestDirectory() {
  return (await createTestSetup()).directory
}

// Also exposes `tolc`, a fake TOLC server the Directory's membership checks
// ask, and `signUpWithGitHub`, standing in for Better Auth creating its
// user row on a first GitHub sign-in. Returns that row's id (`authUserId`).
// `addSecondarySkill` and `addLink` write straight to the database, standing
// in for profile editing (#7).
export async function createTestSetup() {
  const db = drizzle(new PGlite(), { schema })
  await migrate(db, { migrationsFolder: 'drizzle' })
  let userCount = 0
  const tolc = createFakeTolc()
  return {
    directory: createDirectory(db, { membershipChecker: tolc }),
    tolc,
    async signUpWithGitHub(githubUsername: string): Promise<string> {
      const id = `user-${++userCount}`
      await db.insert(schema.user).values({
        id,
        name: githubUsername,
        email: `${githubUsername}@example.com`,
        githubUsername,
      })
      return id
    },
    async addSecondarySkill(authUserId: string, skillName: string) {
      const memberId = await memberIdFor(authUserId)
      const [skill] = await db
        .select({ id: schema.skills.id })
        .from(schema.skills)
        .where(eq(schema.skills.name, skillName))
      await db.insert(schema.memberSkills).values({ memberId, skillId: skill.id })
    },
    async addLink(authUserId: string, link: MemberLink) {
      const memberId = await memberIdFor(authUserId)
      await db.insert(schema.links).values({ memberId, ...link })
    },
  }

  async function memberIdFor(authUserId: string) {
    const [member] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.authUserId, authUserId))
    return member.id
  }
}

function createFakeTolc() {
  const discordUserIds = new Set<string>()
  let failure: 'down' | 'refusing' | null = null
  let checks = 0
  const checker: MembershipChecker = {
    async isInTolc({ discordUserId }) {
      checks++
      if (failure === 'down') throw new DiscordUnavailableError('Discord is down')
      if (failure === 'refusing') throw new Error('Discord returned 401')
      return discordUserIds.has(discordUserId)
    },
  }
  return {
    ...checker,
    join(discordUserId: string) {
      discordUserIds.add(discordUserId)
    },
    leave(discordUserId: string) {
      discordUserIds.delete(discordUserId)
    },
    goDown() {
      failure = 'down'
    },
    // Like a revoked Discord link: Discord is up but won't answer.
    refuse() {
      failure = 'refusing'
    },
    // Undoes `goDown` or `refuse`.
    comeBack() {
      failure = null
    },
    // How many times the Directory asked, including failed attempts.
    get checks() {
      return checks
    },
  }
}
