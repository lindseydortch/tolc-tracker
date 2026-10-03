import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { landingPage, requireSignedInMember } from '../auth/session'
import { useSignOut } from '../auth/use-sign-out'
import { getSignupCatalogs, submitProfile } from '../directory/directory-fns'
import {
  emptyForm,
  findInCatalog,
  profileProblems,
  skillsForLayer,
  stackLayerLabels,
  stackLayers,
} from '../directory/profile'
import { DetailsFields, Problem, Resolved } from '../directory/profile-fields'
import { SaveStatus, useSavedForm } from '../directory/saved-form'

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

function Signup() {
  const catalogs = Route.useLoaderData()
  const router = useRouter()
  const signOut = useSignOut()
  // Follows the redirect if the Member no longer belongs on this page.
  const saveProfile = useServerFn(submitProfile)
  const { form, update, problems, status, onSubmit } = useSavedForm({
    initial: emptyForm,
    problemsOf: (profile) => profileProblems(profile, catalogs),
    save: (profile) => saveProfile({ data: profile }),
    onSaved: () => router.navigate({ to: '/' }),
  })

  return (
    <main>
      <h1>Create your profile</h1>
      <p>Every field is required before you can see the Directory.</p>
      <form onSubmit={onSubmit} noValidate>
        <DetailsFields
          form={form}
          update={update}
          problems={problems}
          catalogs={catalogs}
        />

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
                  catalog="Skill Catalog"
                />
              </p>
            )
          })}
          <Problem text={problems.preferredStack} />
        </fieldset>

        {Object.keys(problems).length > 0 && (
          <p role="alert">Fix the fields above to continue.</p>
        )}
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save profile'}
        </button>
        <SaveStatus status={status} />
      </form>
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </main>
  )
}
