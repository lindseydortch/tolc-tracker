import { Link, createFileRoute } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { StackLayer } from '../../directory/directory'
import type { EditResult } from '../../directory/profile-editing'
import {
  addSkill,
  getProfileEditor,
  markEditProfileSeen,
  removeSkill,
  saveLinks,
  setTypeScriptBadge,
  updateDetails,
} from '../../directory/profile-editing-fns'
import {
  detailsProblems,
  findInCatalog,
  profileCompleteness,
  skillsForLayer,
  stackLayerLabels,
  stackLayers,
} from '../../directory/profile'
import {
  linksProblems,
  optionalLinks,
  type CustomLinkForm,
  type LinksForm,
} from '../../directory/profile-links'
import { Problem } from '../../directory/problem'
import { DetailsFields, Resolved } from '../../directory/profile-fields'
import { useReloadAfterChange } from '../../directory/reload-after-change'
import { SaveStatus, useSavedForm, useServerChange } from '../../directory/saved-form'

// A Member edits their own profile here, and only their own: the server
// functions always edit the signed-in Member.
export const Route = createFileRoute('/_member/edit-profile')({
  loader: () => getProfileEditor(),
  component: EditProfile,
})

function EditProfile() {
  useMarkSeen()
  const links = useLinksForm()
  return (
    <main className="page page-narrow">
      <Link to="/" className="back">
        <ArrowLeft size={16} aria-hidden="true" />
        Back to the Directory
      </Link>
      <div className="page-head">
        <h1 className="page-title">Edit your profile</h1>
        <p className="muted">Each section saves on its own.</p>
        <Completeness unsavedLinks={links.form} />
      </div>
      <DetailsSection />
      <TechStackSection />
      <LinksSection links={links} />
    </main>
  )
}

// Opening this page once clears the Edit Profile nav dot for good. The
// held sign-in check is marked at once, so leaving before the server has
// saved it doesn't bring the dot back. Another device's held check keeps
// the dot until it asks again (`SIGN_IN_REUSE_MS`).
function useMarkSeen() {
  const { member, signIn } = Route.useRouteContext()
  const markSeen = useServerFn(markEditProfileSeen)
  useEffect(() => {
    if (member.editProfileSeen) return
    // This runs before the layout's own `remember`, on a page loaded
    // straight from the server.
    signIn.remember(member)
    signIn.sawEditProfile()
    void markSeen()
  }, [member, signIn, markSeen])
}

// Only ever the signed-in Member's own profile, so no one sees another
// Member's percentage. It counts what's saved: saving a section reloads the
// profile, which updates it. Links typed but not yet saved get a reminder.
function Completeness({ unsavedLinks }: { unsavedLinks: LinksForm }) {
  const { profile } = Route.useLoaderData()
  const { percent, next } = profileCompleteness(profile)
  const unsaved = profileCompleteness({ ...profile, links: unsavedLinks }).percent
  return (
    <div className="completeness">
      <p aria-live="polite">
        <strong>{percent}% complete.</strong>{' '}
        {next ? `Next: ${next}.` : 'Your profile is complete.'}
        {unsaved !== percent && ` Save your Links to make it ${unsaved}%.`}
      </p>
      <div
        className="completeness-bar"
        role="progressbar"
        aria-label="Profile completeness"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        data-complete={next ? undefined : ''}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}

function DetailsSection() {
  const { profile, catalogs } = Route.useLoaderData()
  const save = useServerFn(updateDetails)
  const { form, update, problems, status, onSubmit } = useSavedForm({
    initial: profile.details,
    problemsOf: (details) => detailsProblems(details, catalogs),
    save: (details) => save({ data: details }),
  })

  return (
    <section className="form-section">
      <h2>Details</h2>
      <form onSubmit={onSubmit} noValidate className="group">
        <DetailsFields
          form={form}
          update={update}
          problems={problems}
          catalogs={catalogs}
        />
        <div className="form-foot">
          <button type="submit" className="btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save details'}
          </button>
          <SaveStatus status={status} />
        </div>
      </form>
    </section>
  )
}

function TechStackSection() {
  const { profile } = Route.useLoaderData()
  const reload = useReloadAfterChange()
  const remove = useServerFn(removeSkill)
  const setBadge = useServerFn(setTypeScriptBadge)
  const { busy, problem, setProblem, run } = useServerChange()
  const primary = (layer: StackLayer) =>
    profile.techStack.find((skill) => skill.stackLayer === layer)?.name
  const secondary = profile.techStack.filter((skill) => !skill.stackLayer)

  const change = (send: () => Promise<EditResult | void>) =>
    run(send, async (result) => {
      if (result && !result.ok) setProblem(result.problem)
      await reload()
    })

  const onRemove = (skill: string) => change(() => remove({ data: { skill } }))
  const onBadgeChange = (on: boolean) => change(() => setBadge({ data: { on } }))

  return (
    <section className="form-section">
      <h2>Tech Stack</h2>
      <div className="group">
        <h3 className="subhead">Preferred Stack</h3>
        <dl className="stack-list">
          {stackLayers.map((layer) => {
            const name = primary(layer)
            return (
              <div key={layer} className={name ? 'layer' : 'layer layer-empty'}>
                <dt>{stackLayerLabels[layer]}</dt>
                <dd>
                  {name ?? 'Empty'}
                  {name && (
                    <button
                      type="button"
                      className="btn-icon btn-quiet"
                      disabled={busy}
                      onClick={() => onRemove(name)}
                      aria-label={`Remove ${name}`}
                      title={`Remove ${name}`}
                    >
                      <X size={16} aria-hidden="true" />
                    </button>
                  )}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
      <div className="group">
        <h3 className="subhead">Secondary Skills</h3>
        {secondary.length === 0 ? (
          <p className="muted">None yet.</p>
        ) : (
          <ul className="chips">
            {secondary.map((skill) => (
              <li key={skill.name} className="chip chip-removable">
                {skill.name}
                <button
                  type="button"
                  className="chip-remove"
                  disabled={busy}
                  onClick={() => onRemove(skill.name)}
                  aria-label={`Remove ${skill.name}`}
                >
                  <X size={12} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <Problem text={problem} />
      <p>
        <label className="check">
          <input
            type="checkbox"
            checked={profile.typeScriptBadge}
            disabled={busy}
            onChange={(e) => onBadgeChange(e.target.checked)}
          />
          I know TypeScript (TypeScript Badge)
        </label>
      </p>
      <AddSkillForm />
    </section>
  )
}

function AddSkillForm() {
  const { catalogs } = Route.useLoaderData()
  const reload = useReloadAfterChange()
  const add = useServerFn(addSkill)
  const [skill, setSkill] = useState('')
  const [inPreferredStack, setInPreferredStack] = useState(false)
  const [stackLayer, setStackLayer] = useState<StackLayer | null>(null)
  const { busy, problem, setProblem, run } = useServerChange()
  // The Skill the chosen Stack Layer holds, while the Member decides
  // whether to replace it.
  const [occupiedBy, setOccupiedBy] = useState<string>()
  const layer = inPreferredStack ? stackLayer : null
  const choices = layer
    ? skillsForLayer(catalogs.skills, layer)
    : catalogs.skills

  const edit = (change: () => void) => {
    change()
    setProblem(undefined)
    setOccupiedBy(undefined)
  }

  function send(replace: boolean) {
    if (inPreferredStack && !stackLayer) {
      setProblem('Choose a Stack Layer')
      return
    }
    return run(
      () => add({ data: { skill, stackLayer: layer, replace } }),
      async (result) => {
        if (result.ok) {
          setSkill('')
          setInPreferredStack(false)
          setStackLayer(null)
          setOccupiedBy(undefined)
          await reload()
        } else if ('occupiedBy' in result) {
          setOccupiedBy(result.occupiedBy)
        } else {
          setProblem(result.problem)
        }
      },
    )
  }

  return (
    <form
      className="group add-skill"
      onSubmit={(event) => {
        event.preventDefault()
        send(false)
      }}
      noValidate
    >
      <h3 className="subhead">Add a Skill</h3>
      <datalist id="add-skill">
        {choices.map((choice) => (
          <option key={choice.name} value={choice.name}>
            {choice.aliases.join(', ')}
          </option>
        ))}
      </datalist>
      <p className="field">
        <label>
          Skill
          <input
            list="add-skill"
            value={skill}
            onChange={(e) => edit(() => setSkill(e.target.value))}
          />
        </label>
        <Resolved
          typed={skill}
          name={findInCatalog(catalogs.skills, skill)?.name}
          catalog="Skill Catalog"
        />
      </p>
      <p>
        <label className="check">
          <input
            type="checkbox"
            checked={inPreferredStack}
            onChange={(e) => edit(() => setInPreferredStack(e.target.checked))}
          />
          Part of my Preferred Stack?
        </label>
      </p>
      {inPreferredStack && (
        <p className="field">
          <label>
            Stack Layer
            <select
              value={stackLayer ?? ''}
              onChange={(e) =>
                edit(() => setStackLayer((e.target.value as StackLayer) || null))
              }
            >
              <option value="">Choose one</option>
              {stackLayers.map((option) => (
                <option key={option} value={option}>
                  {stackLayerLabels[option]}
                </option>
              ))}
            </select>
          </label>
        </p>
      )}
      <Problem text={problem} />
      {occupiedBy && layer ? (
        <div role="alert" className="confirm">
          <p>
            Your {stackLayerLabels[layer]} is {occupiedBy}. Replace it with{' '}
            {findInCatalog(catalogs.skills, skill)?.name ?? skill.trim()}?{' '}
            {occupiedBy} will become a Secondary Skill.
          </p>
          <div className="confirm-actions">
            <button type="button" className="btn-primary" disabled={busy} onClick={() => send(true)}>
              Replace {occupiedBy}
            </button>
            <button type="button" onClick={() => setOccupiedBy(undefined)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="submit" className="btn-primary add-row" disabled={busy}>
          <Plus size={16} aria-hidden="true" />
          {busy ? 'Adding…' : 'Add Skill'}
        </button>
      )}
    </form>
  )
}

// Held by the page, so the completeness bar can see Links not yet saved.
function useLinksForm() {
  const { profile } = Route.useLoaderData()
  const save = useServerFn(saveLinks)
  return useSavedForm({
    initial: profile.links,
    problemsOf: linksProblems,
    save: (links) => save({ data: links }),
  })
}

function LinksSection({ links }: { links: ReturnType<typeof useLinksForm> }) {
  const { form, update, problems, status, onSubmit } = links
  const updateCustom = (index: number, changes: Partial<CustomLinkForm>) =>
    update({
      custom: form.custom.map((link, i) => (i === index ? { ...link, ...changes } : link)),
    })

  return (
    <section className="form-section">
      <h2>Links</h2>
      <form onSubmit={onSubmit} noValidate className="group">
        <p className="hint">LinkedIn and GitHub are always on your profile. These are optional.</p>
        <div className="form-grid">
        {optionalLinks.map(({ kind, label, placeholder }) => (
          <p key={kind} className="field">
            <label>
              {label}
              <input
                inputMode="url"
                value={form[kind]}
                onChange={(e) => update({ [kind]: e.target.value })}
                placeholder={placeholder}
              />
            </label>
            <Problem text={problems[kind]} />
          </p>
        ))}
        </div>
        <fieldset className="group">
          <legend>Custom Links</legend>
          {form.custom.map((link, index) => (
            <p key={index} className="repeat-row">
              <label className="field">
                Label
                <input
                  value={link.label}
                  onChange={(e) => updateCustom(index, { label: e.target.value })}
                />
              </label>
              <label className="field">
                URL
                <input
                  inputMode="url"
                  value={link.url}
                  onChange={(e) => updateCustom(index, { url: e.target.value })}
                />
              </label>
              <button
                type="button"
                className="btn-quiet"
                onClick={() =>
                  update({ custom: form.custom.filter((_, i) => i !== index) })
                }
              >
                <X size={16} aria-hidden="true" />
                Remove
              </button>
              <Problem text={problems.custom?.[index]} />
            </p>
          ))}
          <button
            type="button"
            className="add-row"
            onClick={() => update({ custom: [...form.custom, { label: '', url: '' }] })}
          >
            <Plus size={16} aria-hidden="true" />
            Add a Custom Link
          </button>
        </fieldset>
        <div className="form-foot">
          <button type="submit" className="btn-primary" disabled={status === 'saving'}>
            {status === 'saving' ? 'Saving…' : 'Save Links'}
          </button>
          <SaveStatus status={status} />
        </div>
      </form>
    </section>
  )
}
