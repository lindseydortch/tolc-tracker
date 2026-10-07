import type { SignInCache } from './auth/sign-in-cache'
import type { FinishProfilePrompt } from './directory/finish-profile-prompt'

// What every route can reach through `context`.
export type RouterContext = {
  signIn: SignInCache
  finishProfilePrompt: FinishProfilePrompt
}
