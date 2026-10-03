import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState, type FormEvent } from 'react'
import { landingPage, requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'
import type { Seniority, StackLayer } from '../directory/directory'
import { getSignupCatalogs, submitProfile } from '../directory/directory-fns'
import {
  findInCatalog,
  jobSearchStatusLabels,
  profileProblems,
  seniorityLabels,
  skillsForLayer,
  stackLayerLabels,
  type ProfileForm,
  type ProfileProblems,
} from '../directory/profile'

// The required profile form a Member fills once they're in TOLC. They stay
// here until it's complete, and only then reach the Directory.
export const Route = createFileRoute('/signup')({
  beforeLoad: async () => {
    const member = await requireSignedInMember()
    const page = landingPage(member)
    if (page !== '/signup') throw redirect({ to: page })
  },
  loader: () => getSignupCatalogs(),
  component: Signup,
})

const emptyForm: ProfileForm = {
  firstName: '',
  lastName: '',
  linkedinUrl: '',
  jobSearchStatus: null,
  targetRoles: [''],
  preferredSeniority: null,
  otherSeniorities: [],
  preferredStack: {},
}

const seniorities = Object.keys(seniorityLabels) as Seniority[]
const stackLayers = Object.keys(stackLayerLabels) as StackLayer[]

function Signup() {
  const catalogs = Route.useLoaderData()
  const router = useRouter()
  const signOut = useSignOut()
  // Follows the redirect if the Member no longer belongs on this page.
  const saveProfile = useServerFn(submitProfile)
  const [form, setForm] = useState(emptyForm)
  // Problems show once the Member first tries to save, then follow their
  // edits, so a fixed field stops showing its message right away.
  const [attempted, setAttempted] = useState(false)
  const [serverProblems, setServerProblems] = useState<ProfileProblems>({})
  const [submitting, setSubmitting] = useState(false)
  const problems = attempted
    ? { ...serverProblems, ...profileProblems(form, catalogs) }
    : {}

  const update = (changes: Partial<ProfileForm>) => {
    setForm((current) => ({ ...current, ...changes }))
    setServerProblems({})
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(profileProblems(form, catalogs)).length > 0) return
    setSubmitting(true)
    try {
      const result = await saveProfile({ data: form })
      if (!result.ok) {
        setServerProblems(result.problems)
        return
      }
      await router.navigate({ to: '/' })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSeniority = (seniority: Seniority, accepted: boolean) =>
    update({
      otherSeniorities: accepted
        ? [...form.otherSeniorities, seniority]
        : form.otherSeniorities.filter((s) => s !== seniority),
    })

  return (
    <main>
      <h1>Create your profile</h1>
      <p>Every field is required before you can see the Directory.</p>
      <form onSubmit={onSubmit} noValidate>
        <p>
          <label>
            First name{' '}
            <input
              value={form.firstName}
              onChange={(e) => update({ firstName: e.target.value })}
              autoComplete="given-name"
            />
          </label>
          <Problem text={problems.firstName} />
        </p>
        <p>
          <label>
            Last name{' '}
            <input
              value={form.lastName}
              onChange={(e) => update({ lastName: e.target.value })}
              autoComplete="family-name"
            />
          </label>
          <Problem text={problems.lastName} />
        </p>
        <p>
          <label>
            LinkedIn profile URL{' '}
            <input
              inputMode="url"
              value={form.linkedinUrl}
              onChange={(e) => update({ linkedinUrl: e.target.value })}
              placeholder="https://www.linkedin.com/in/you"
            />
          </label>
          <Problem text={problems.linkedinUrl} />
        </p>
        <p>
          <label>
            Job Search Status{' '}
            <select
              value={form.jobSearchStatus ?? ''}
              onChange={(e) =>
                update({
                  jobSearchStatus:
                    (e.target.value as ProfileForm['jobSearchStatus']) || null,
                })
              }
            >
              <option value="">Choose one</option>
              {Object.entries(jobSearchStatusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <Problem text={problems.jobSearchStatus} />
        </p>

        <fieldset>
          <legend>Target Roles</legend>
          <datalist id="target-roles">
            {catalogs.roles.map((role) => (
              <option key={role.name} value={role.name}>
                {role.aliases.join(', ')}
              </option>
            ))}
          </datalist>
          {form.targetRoles.map((typed, index) => (
            <p key={index}>
              <label>
                Target Role {index + 1}{' '}
                <input
                  list="target-roles"
                  value={typed}
                  onChange={(e) =>
                    update({
                      targetRoles: form.targetRoles.map((old, i) =>
                        i === index ? e.target.value : old,
                      ),
                    })
                  }
                />
              </label>{' '}
              <Resolved typed={typed} name={findInCatalog(catalogs.roles, typed)?.name} />
              {form.targetRoles.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    update({
                      targetRoles: form.targetRoles.filter((_, i) => i !== index),
                    })
                  }
                >
                  Remove
                </button>
              )}
            </p>
          ))}
          <button
            type="button"
            onClick={() => update({ targetRoles: [...form.targetRoles, ''] })}
          >
            Add another Target Role
          </button>
          <Problem text={problems.targetRoles} />
        </fieldset>

        <fieldset>
          <legend>Seniority</legend>
          <p>Choose one Preferred Seniority, and any others you'd accept.</p>
          <table>
            <thead>
              <tr>
                <th scope="col">Seniority</th>
                <th scope="col">Preferred</th>
                <th scope="col">Would also accept</th>
              </tr>
            </thead>
            <tbody>
              {seniorities.map((seniority) => {
                const preferred = form.preferredSeniority === seniority
                return (
                  <tr key={seniority}>
                    <th scope="row">{seniorityLabels[seniority]}</th>
                    <td>
                      <input
                        type="radio"
                        name="preferredSeniority"
                        aria-label={`${seniorityLabels[seniority]} is my Preferred Seniority`}
                        checked={preferred}
                        onChange={() => update({ preferredSeniority: seniority })}
                      />
                    </td>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`I would also accept ${seniorityLabels[seniority]}`}
                        disabled={preferred}
                        checked={preferred || form.otherSeniorities.includes(seniority)}
                        onChange={(e) => toggleSeniority(seniority, e.target.checked)}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Problem text={problems.preferredSeniority} />
        </fieldset>

        <fieldset>
          <legend>Preferred Stack</legend>
          <p>
            The Skill you'd prefer in your next role for each Stack Layer. Fill
            at least one.
          </p>
          {stackLayers.map((layer) => {
            const typed = form.preferredStack[layer] ?? ''
            return (
              <p key={layer}>
                <datalist id={`layer-${layer}`}>
                  {skillsForLayer(catalogs.skills, layer).map((skill) => (
                    <option key={skill.name} value={skill.name}>
                      {skill.aliases.join(', ')}
                    </option>
                  ))}
                </datalist>
                <label>
                  {stackLayerLabels[layer]}{' '}
                  <input
                    list={`layer-${layer}`}
                    value={typed}
                    onChange={(e) =>
                      update({
                        preferredStack: {
                          ...form.preferredStack,
                          [layer]: e.target.value,
                        },
                      })
                    }
                  />
                </label>{' '}
                <Resolved
                  typed={typed}
                  name={findInCatalog(catalogs.skills, typed)?.name}
                />
              </p>
            )
          })}
          <Problem text={problems.preferredStack} />
        </fieldset>

        {Object.keys(problems).length > 0 && (
          <p role="alert">Fix the fields above to continue.</p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : 'Save profile'}
        </button>
      </form>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}

function Problem({ text }: { text?: string }) {
  if (!text) return null
  return <span role="alert"> {text}</span>
}

// Shows which Catalog entry a typed name or Alias resolves to.
function Resolved({ typed, name }: { typed: string; name?: string }) {
  if (!typed.trim()) return null
  if (!name) return <span>Not in the Catalog</span>
  if (name === typed.trim()) return null
  return <span>Saved as {name}</span>
}
