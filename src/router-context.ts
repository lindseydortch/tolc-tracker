import type { SignInCache } from './auth/sign-in-cache'

// What every route can reach through `context`.
export type RouterContext = { signIn: SignInCache }
