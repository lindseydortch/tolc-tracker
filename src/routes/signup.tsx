import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { CircleAlert, LogOut } from 'lucide-react'
import { landingPage } from '../auth/landing-page'
import { requireSignedInMember } from '../auth/session'
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
import { Wordmark } from '../ui/marks'

// The required profile form a Member fills once they're in TOLC. They stay
// here until it's complete, and only then reach the Directory.
export const Route = createFileRoute('/signup')({
  beforeLoad: async ({ context }) => {
    const member = requireSignedInMember(await context.signIn.fresh())
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
    <>
      <header className="topbar">
        <Wordmark />
        <div className="topbar-me">
          <button type="button" className="btn btn-quiet" onClick={signOut}>
            <LogOut size={16} aria-hidden="true" />
            <span>Sign out</span>
          </button>
        </div>
      </header>
    <main className="page page-narrow">
      <div className="page-head">
        <h1 className="page-title">Create your profile</h1>
        <p className="muted">Every field is required before you can see the Directory.</p>
      </div>
      <form onSubmit={onSubmit} noValidate>
        <section className="form-section">
          <h2>Details</h2>
          <DetailsFields
            form={form}
            update={update}
            problems={problems}
            catalogs={catalogs}
          />
        </section>

        <fieldset className="form-section">
          <legend className="form-legend">
            <h2>Preferred Stack</h2>
          </legend>
          <p className="hint form-legend-hint">
            The Skill you'd prefer in your next role for each Stack Layer. Fill
            at least one.
          </p>
          <div className="form-grid">
          {stackLayers.map((layer) => {
            const typed = form.preferredStack[layer] ?? ''
            return (
              <p key={layer} className="field">
                <datalist id={`layer-${layer}`}>
                  {skillsForLayer(catalogs.skills, layer).map((skill) => (
                    <option key={skill.name} value={skill.name}>
                      {skill.aliases.join(', ')}
                    </option>
                  ))}
                </datalist>
                <label>
                  {stackLayerLabels[layer]}
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
                </label>
                <Resolved
                  typed={typed}
                  name={findInCatalog(catalogs.skills, typed)?.name}
                  catalog="Skill Catalog"
                />
              </p>
            )
          })}
          </div>
          <Problem text={problems.preferredStack} />
        </fieldset>

        <div className="form-foot">
          <button type="submit" className="btn-primary btn-lg" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save profile'}
          </button>
          {Object.keys(problems).length > 0 && (
            <p role="alert" className="problem">
              <CircleAlert size={14} aria-hidden="true" />
              Fix the fields above to continue.
            </p>
          )}
          <SaveStatus status={status} />
        </div>
      </form>
    </main>
    </>
  )
}
