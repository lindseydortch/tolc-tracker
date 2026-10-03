import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { requireSignedInMember } from '../auth/session'

// Every page under this layout is for signed-in Members with Discord
// connected. Without Discord, the Connect Discord step is all they see.
export const Route = createFileRoute('/_member')({
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    const { discordHandle } = member
    if (!discordHandle) throw redirect({ to: '/connect-discord' })
    // Pages below can rely on the handle being present.
    return { member: { ...member, discordHandle } }
  },
  component: Outlet,
})
