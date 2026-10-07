// The Directory's once-only prompt to finish a profile, raised by sending
// the signup form. It lives on the router, in the browser only, so a
// reload, the Back button or the server's render never brings it back.
export function createFinishProfilePrompt() {
  let raised = false
  return {
    raise: () => {
      raised = true
    },
    isRaised: () => raised,
    // Once the Directory has shown it.
    lower: () => {
      raised = false
    },
  }
}

export type FinishProfilePrompt = ReturnType<typeof createFinishProfilePrompt>
