import type { ProfileForm } from './profile'
import { starterCatalogs } from './starter-catalogs'
import { createTestSetup, testAdminDiscordUserId } from './test-directory'

export type TestSetup = Awaited<ReturnType<typeof createTestSetup>>

let discordIds = 80351110224678912n

// A test Directory with the starter Catalogs loaded.
export async function seededSetup(): Promise<TestSetup> {
  const setup = await createTestSetup()
  await setup.directory.seedCatalogs(starterCatalogs)
  return setup
}

// A Member who is in TOLC and has not filled the signup form yet. Pass
// `discordUserId` to choose their Discord account, such as the Admin's.
export async function memberInTolc(
  setup: TestSetup,
  githubUsername: string,
  discordUserId = String(discordIds++),
) {
  const { directory, tolc, signUpWithGitHub } = setup
  const authUserId = await signUpWithGitHub(githubUsername)
  await directory.signIn({ authUserId, githubUsername })
  const discord = { userId: discordUserId, handle: `${githubUsername}_dc`, avatar: null }
  await directory.connectDiscord({ authUserId, discord })
  tolc.join(discord.userId)
  await directory.checkMembership({ authUserId })
  return { authUserId, discord }
}

export const octoForm: ProfileForm = {
  firstName: 'Octo',
  lastName: 'Cat',
  linkedinUrl: 'https://www.linkedin.com/in/octocat',
  jobSearchStatus: 'activelyLooking',
  targetRoles: ['Software Engineer'],
  preferredSeniority: 'senior',
  otherSeniorities: ['mid'],
  preferredStack: { frontendFramework: 'React', database: 'PostgreSQL' },
}

// A Member in TOLC who has completed the signup form with `octoForm`.
export async function memberWithProfile(
  setup: TestSetup,
  githubUsername: string,
  discordUserId?: string,
) {
  const member = await memberInTolc(setup, githubUsername, discordUserId)
  const result = await setup.directory.completeProfile({
    authUserId: member.authUserId,
    form: octoForm,
  })
  if (!result.ok) throw new Error('octoForm should complete a profile')
  return member
}

// Makes the Admin a Member, then hides the Member signed in as
// `authUserId` as the Admin would. Call it at most once per setup.
export async function hideAsAdmin(setup: TestSetup, authUserId: string) {
  const { authUserId: admin } = await memberInTolc(
    setup,
    'tolc-owner',
    testAdminDiscordUserId,
  )
  const member = await setup.directory.memberForAuthUser(authUserId)
  if (!member) throw new Error(`No Member for auth user "${authUserId}"`)
  await setup.directory.hideMember({ authUserId: admin, memberId: member.id })
  return { admin, memberId: member.id }
}
