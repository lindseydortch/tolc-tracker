import { Link, createFileRoute, useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import type { StackLayer } from '../../directory/directory'
import type { EditResult } from '../../directory/profile-editing'
import {
  addSkill,
  getProfileEditor,
  removeSkill,
  saveLinks,
  setTypeScriptBadge,
  updateDetails,
} from '../../directory/profile-editing-fns'
import {
  detailsProblems,
  findInCatalog,
  linksProblems,
  optionalLinks,
  skillsForLayer,
  stackLayerLabels,
  stackLayers,
  type CustomLinkForm,
} from '../../directory/profile'
import { DetailsFields, Problem, Resolved } from '../../directory/profile-fields'
import { refreshAfterEdit } from '../../directory/refresh-after-edit'
import { SaveStatus, useSavedForm, useServerChange } from '../../directory/saved-form'

// A Member edits their own profile here, and only their own: the server
// functions always edit the signed-in Member.
export const Route = createFileRoute('/_member/edit-profile')({
  loader: () => getProfileEditor(),
  component: EditProfile,
})

function EditProfile() {
  return (
    <main>
      <p>
        <Link to="/">Back to the Directory</Link>
      </p>
      <h1>Edit your profile</h1>
      <DetailsSection />
      <TechStackSection />
      <LinksSection />
    </main>
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
    <section>
      <h2>Details</h2>
      <form onSubmit={onSubmit} noValidate>
        <DetailsFields
          form={form}
          update={update}
          problems={problems}
          catalogs={catalogs}
        />
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save details'}
        </button>
        <SaveStatus status={status} />
      </form>
    </section>
  )
}

function TechStackSection() {
  const { profile } = Route.useLoaderData()
  const router = useRouter()
  const remove = useServerFn(removeSkill)
  const setBadge = useServerFn(setTypeScriptBadge)
  const { busy, problem, setProblem, run } = useServerChange()
  const primary = (layer: StackLayer) =>
    profile.techStack.find((skill) => skill.stackLayer === layer)?.name
  const secondary = profile.techStack.filter((skill) => !skill.stackLayer)

  const change = (send: () => Promise<EditResult | void>) =>
    run(send, async (result) => {
      if (result && !result.ok) setProblem(result.problem)
      await refreshAfterEdit(router)
    })

  const onRemove = (skill: string) => change(() => remove({ data: { skill } }))
  const onBadgeChange = (on: boolean) => change(() => setBadge({ data: { on } }))

  return (
    <section>
      <h2>Tech Stack</h2>
      <h3>Preferred Stack</h3>
      <dl>
        {stackLayers.map((layer) => {
          const name = primary(layer)
          return (
            <div key={layer}>
              <dt>{stackLayerLabels[layer]}</dt>
              <dd>
                {name ?? 'Empty'}
                {name && (
                  <>
                    {' '}
                    <button type="button" disabled={busy} onClick={() => onRemove(name)}>
                      Remove {name}
                    </button>
                  </>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
      <h3>Secondary Skills</h3>
      {secondary.length === 0 ? (
        <p>None yet.</p>
      ) : (
        <ul>
          {secondary.map((skill) => (
            <li key={skill.name}>
              {skill.name}{' '}
              <button type="button" disabled={busy} onClick={() => onRemove(skill.name)}>
                Remove {skill.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      <Problem text={problem} />
      <p>
        <label>
          <input
            type="checkbox"
            checked={profile.typeScriptBadge}
            disabled={busy}
            onChange={(e) => onBadgeChange(e.target.checked)}
          />{' '}
          I know TypeScript (TypeScript Badge)
        </label>
      </p>
      <AddSkillForm />
    </section>
  )
}

function AddSkillForm() {
  const { catalogs } = Route.useLoaderData()
  const router = useRouter()
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
          await refreshAfterEdit(router)
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
      onSubmit={(event) => {
        event.preventDefault()
        send(false)
      }}
      noValidate
    >
      <h3>Add a Skill</h3>
      <datalist id="add-skill">
        {choices.map((choice) => (
          <option key={choice.name} value={choice.name}>
            {choice.aliases.join(', ')}
          </option>
        ))}
      </datalist>
      <p>
        <label>
          Skill{' '}
          <input
            list="add-skill"
            value={skill}
            onChange={(e) => edit(() => setSkill(e.target.value))}
          />
        </label>{' '}
        <Resolved
          typed={skill}
          name={findInCatalog(catalogs.skills, skill)?.name}
          catalog="Skill Catalog"
        />
      </p>
      <p>
        <label>
          <input
            type="checkbox"
            checked={inPreferredStack}
            onChange={(e) => edit(() => setInPreferredStack(e.target.checked))}
          />{' '}
          Part of my Preferred Stack?
        </label>
      </p>
      {inPreferredStack && (
        <p>
          <label>
            Stack Layer{' '}
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
        <p role="alert">
          Your {stackLayerLabels[layer]} is {occupiedBy}. Replace it with{' '}
          {findInCatalog(catalogs.skills, skill)?.name ?? skill.trim()}?{' '}
          {occupiedBy} will become a Secondary Skill.{' '}
          <button type="button" disabled={busy} onClick={() => send(true)}>
            Replace {occupiedBy}
          </button>{' '}
          <button type="button" onClick={() => setOccupiedBy(undefined)}>
            Cancel
          </button>
        </p>
      ) : (
        <button type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add Skill'}
        </button>
      )}
    </form>
  )
}

function LinksSection() {
  const { profile } = Route.useLoaderData()
  const save = useServerFn(saveLinks)
  const { form, update, problems, status, onSubmit } = useSavedForm({
    initial: profile.links,
    problemsOf: linksProblems,
    save: (links) => save({ data: links }),
  })
  const updateCustom = (index: number, changes: Partial<CustomLinkForm>) =>
    update({
      custom: form.custom.map((link, i) => (i === index ? { ...link, ...changes } : link)),
    })

  return (
    <section>
      <h2>Links</h2>
      <form onSubmit={onSubmit} noValidate>
        <p>LinkedIn and GitHub are always on your profile. These are optional.</p>
        {optionalLinks.map(({ kind, label, placeholder }) => (
          <p key={kind}>
            <label>
              {label}{' '}
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
        <fieldset>
          <legend>Custom Links</legend>
          {form.custom.map((link, index) => (
            <p key={index}>
              <label>
                Label{' '}
                <input
                  value={link.label}
                  onChange={(e) => updateCustom(index, { label: e.target.value })}
                />
              </label>{' '}
              <label>
                URL{' '}
                <input
                  inputMode="url"
                  value={link.url}
                  onChange={(e) => updateCustom(index, { url: e.target.value })}
                />
              </label>{' '}
              <button
                type="button"
                onClick={() =>
                  update({ custom: form.custom.filter((_, i) => i !== index) })
                }
              >
                Remove
              </button>
              <Problem text={problems.custom?.[index]} />
            </p>
          ))}
          <button
            type="button"
            onClick={() => update({ custom: [...form.custom, { label: '', url: '' }] })}
          >
            Add a Custom Link
          </button>
        </fieldset>
        <button type="submit" disabled={status === 'saving'}>
          {status === 'saving' ? 'Saving…' : 'Save Links'}
        </button>
        <SaveStatus status={status} />
      </form>
    </section>
  )
}
