import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { getSignedInMember } from '../auth/session'

// Every page under this layout is for signed-in Members only.
export const Route = createFileRoute('/_member')({
  beforeLoad: async () => {
    const member = await getSignedInMember()
    if (!member) throw redirect({ to: '/sign-in' })
    return { member }
  },
  component: Outlet,
})
