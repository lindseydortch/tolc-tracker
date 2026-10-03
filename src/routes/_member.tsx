import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { landingPage, requireSignedInMember } from '../auth/session'

// Every page under this layout is for signed-in Members with Discord
// connected who are in TOLC. Everyone else is sent to their `landingPage`.
export const Route = createFileRoute('/_member')({
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    const page = landingPage(member)
    const { discordHandle } = member
    if (page !== '/' || !discordHandle) throw redirect({ to: page })
    // Pages below can rely on the handle being present.
    return { member: { ...member, discordHandle } }
  },
  component: Outlet,
})
