import { Link, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import {
  deleteMember,
  getAdminPage,
  hideMember,
  mergeSkills,
  mergeTargetRoles,
  reactivateMember,
} from '../../directory/admin-fns'
import type { ManagedMember, MemberAdminResult } from '../../directory/member-admin'
import { MergeSection } from '../../directory/merge-section'
import { useAdminRequest } from '../../directory/use-admin-request'
import { NotFoundPage } from '../../not-found-page'

// The Admin hides, reactivates, and deletes Members, and merges duplicate
// Skills and Target Roles, here. Everyone else gets the not-found page.
export const Route = createFileRoute('/_member/admin')({
  loader: () => getAdminPage(),
  component: AdminPage,
  notFoundComponent: () => <NotFoundPage message="Nothing here." />,
})

// A button the Admin page shows on a Member's row.
type MemberAction = {
  label: 'Hide' | 'Reactivate' | 'Delete'
  // Past tense, for the status line: "Hid Ada Lovelace."
  done: string
  request: (memberId: number) => Promise<MemberAdminResult>
  // Asked before sending, if set.
  confirm?: (member: ManagedMember) => string
}

function AdminPage() {
  const { managed, catalogs } = Route.useLoaderData()
  const mergeSkill = useServerFn(mergeSkills)
  const mergeRole = useServerFn(mergeTargetRoles)
  const hideFn = useServerFn(hideMember)
  const reactivateFn = useServerFn(reactivateMember)
  const deleteFn = useServerFn(deleteMember)
  const { status, busy, send } = useAdminRequest()

  const hide: MemberAction = {
    label: 'Hide',
    done: 'Hid',
    request: (memberId) => hideFn({ data: memberId }),
  }
  const reactivate: MemberAction = {
    label: 'Reactivate',
    done: 'Reactivated',
    request: (memberId) => reactivateFn({ data: memberId }),
  }
  const remove: MemberAction = {
    label: 'Delete',
    done: 'Deleted',
    request: (memberId) => deleteFn({ data: memberId }),
    confirm: (member) =>
      `Delete ${member.name}? Their profile and sign-in are removed for good. ` +
      "This can't be undone.",
  }

  function onAction(action: MemberAction, member: ManagedMember) {
    if (action.confirm && !window.confirm(action.confirm(member))) return
    return send(() => action.request(member.id), {
      done: `${action.done} ${member.name}.`,
      failed: `Could not ${action.label.toLowerCase()} ${member.name}. Try again.`,
    })
  }

  return (
    <main>
      <p>
        <Link to="/">Back to the Directory</Link>
      </p>
      <h1>Admin</h1>
      {status && <p role="status">{status}</p>}

      <h2>Members</h2>
      <p>
        Hiding a Member keeps their profile but takes them out of the
        Directory, and they can't see it until you reactivate them.
      </p>
      <MemberTable
        members={managed.members}
        actions={[hide, remove]}
        busy={busy}
        onAction={onAction}
      />

      <h2>Hidden Members</h2>
      {managed.hiddenMembers.length === 0 ? (
        <p>No Hidden Members.</p>
      ) : (
        <MemberTable
          members={managed.hiddenMembers}
          actions={[reactivate, remove]}
          busy={busy}
          onAction={onAction}
        />
      )}

      <h2>Merge Skills and Target Roles</h2>
      <p>
        Merging A into B makes A's name and Aliases into Aliases of B, moves
        every Member using A onto B, then removes A. It can't be undone.
      </p>
      <MergeSection
        kind="Skill"
        listId="skill-catalog"
        entries={catalogs.skills}
        merge={(form) => mergeSkill({ data: form })}
      />
      <MergeSection
        kind="Target Role"
        listId="role-catalog"
        entries={catalogs.roles}
        merge={(form) => mergeRole({ data: form })}
      />
    </main>
  )
}

// The Admin's own row gets no buttons.
function MemberTable({
  members,
  actions,
  busy,
  onAction,
}: {
  members: ManagedMember[]
  actions: MemberAction[]
  busy: boolean
  onAction: (action: MemberAction, member: ManagedMember) => void
}) {
  return (
    <table>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Discord</th>
          <th scope="col">GitHub</th>
          <th scope="col">Actions</th>
        </tr>
      </thead>
      <tbody>
        {members.map((member) => (
          <tr key={member.id}>
            <td>{member.name}</td>
            <td>{member.discordHandle ?? 'Not connected'}</td>
            <td>{member.githubUrl && <a href={member.githubUrl}>{member.githubUrl}</a>}</td>
            <td>
              {member.isYou
                ? 'You'
                : actions.map((action) => (
                    <button
                      key={action.label}
                      type="button"
                      disabled={busy}
                      onClick={() => onAction(action, member)}
                    >
                      {action.label}
                    </button>
                  ))}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
