import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, type ReactNode } from 'react'
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
import { NotFoundPage } from '../../not-found-page'

// The Admin hides, reactivates, and deletes Members, and merges duplicate
// Skills and Target Roles, here. Everyone else gets the not-found page.
export const Route = createFileRoute('/_member/admin')({
  loader: () => getAdminPage(),
  component: AdminPage,
  notFoundComponent: () => <NotFoundPage message="Nothing here." />,
})

function AdminPage() {
  const { managed, catalogs } = Route.useLoaderData()
  const mergeSkill = useServerFn(mergeSkills)
  const mergeRole = useServerFn(mergeTargetRoles)
  const hide = useServerFn(hideMember)
  const reactivate = useServerFn(reactivateMember)
  const remove = useServerFn(deleteMember)
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function act(
    run: () => Promise<MemberAdminResult>,
    done: string,
    failed: string,
  ) {
    setBusy(true)
    try {
      const result = await run()
      setStatus(result.ok ? done : result.problem)
      await router.invalidate()
    } catch {
      setStatus(failed)
    } finally {
      setBusy(false)
    }
  }

  function onDelete(member: ManagedMember) {
    const confirmed = window.confirm(
      `Delete ${member.name}? Their profile and sign-in are removed for good. ` +
        "This can't be undone.",
    )
    if (!confirmed) return
    return act(
      () => remove({ data: member.id }),
      `Deleted ${member.name}.`,
      `Could not delete ${member.name}. Try again.`,
    )
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
      <MemberTable members={managed.members}>
        {(member) => (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                act(
                  () => hide({ data: member.id }),
                  `Hid ${member.name}.`,
                  `Could not hide ${member.name}. Try again.`,
                )
              }
            >
              Hide
            </button>{' '}
            <button type="button" disabled={busy} onClick={() => onDelete(member)}>
              Delete
            </button>
          </>
        )}
      </MemberTable>

      <h2>Hidden Members</h2>
      {managed.hiddenMembers.length === 0 ? (
        <p>No Hidden Members.</p>
      ) : (
        <MemberTable members={managed.hiddenMembers}>
          {(member) => (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    () => reactivate({ data: member.id }),
                    `Reactivated ${member.name}.`,
                    `Could not reactivate ${member.name}. Try again.`,
                  )
                }
              >
                Reactivate
              </button>{' '}
              <button type="button" disabled={busy} onClick={() => onDelete(member)}>
                Delete
              </button>
            </>
          )}
        </MemberTable>
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

// `actions` gives the buttons for each Member; the Admin's own row gets none.
function MemberTable({
  members,
  children: actions,
}: {
  members: ManagedMember[]
  children: (member: ManagedMember) => ReactNode
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
            <td>{member.isYou ? 'You' : actions(member)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
