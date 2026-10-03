import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { db } from '../db/db'
import * as schema from '../db/schema'
import { syncDiscord } from './discord-sync'

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
    // Discord is only ever linked to a Member who signed in with GitHub,
    // never a way to create one.
    discord: {
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // On top of the default `identify` and `email`. Lets the membership
      // check see whether the Member is in TOLC.
      scope: ['guilds'],
      disableSignUp: true,
    },
  },
  account: {
    accountLinking: {
      // A Member's Discord email rarely matches their GitHub one, and an
      // unverified Discord email must not block linking.
      allowDifferentEmails: true,
      trustedProviders: ['discord'],
      // Trusting Discord would otherwise let a Discord sign-in whose email
      // matches a Member's attach itself to that Member. Discord is linked
      // only through the explicit Connect Discord step.
      disableImplicitLinking: true,
    },
  },
  databaseHooks: {
    session: {
      create: {
        // Every sign-in refreshes the Discord handle.
        after: async (session) => {
          await syncDiscord(session.userId)
        },
      },
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
