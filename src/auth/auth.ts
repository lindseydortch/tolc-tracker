import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db/db'
import * as schema from '../db/schema'

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      mapProfileToUser: (profile) => ({ githubUsername: profile.login }),
      // Re-read the profile on every sign-in so a renamed GitHub account
      // (or a sign-in that failed part-way) gets the current username.
      overrideUserInfoOnSignIn: true,
    },
  },
  user: {
    additionalFields: {
      // Not `input: false`: Better Auth would then also drop it from the GitHub
      // profile. Browser writes are blocked by disabling /update-user instead.
      githubUsername: { type: 'string', required: false },
    },
  },
  // Members edit their profile through the Directory, never Better Auth.
  disabledPaths: ['/update-user'],
  // Must stay last so it sees every cookie the other plugins set.
  plugins: [tanstackStartCookies()],
})
