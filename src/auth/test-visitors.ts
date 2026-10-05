import type { SignedInVisitor } from './signed-in-visitor'

// A signed-in Member who belongs in the Directory, for tests.
export const visitorInDirectory: SignedInVisitor = {
  name: 'Ada',
  githubUrl: 'https://github.com/ada',
  discordHandle: 'ada',
  discordSyncFailed: false,
  membership: 'in-tolc',
  profileComplete: true,
  isAdmin: false,
}
