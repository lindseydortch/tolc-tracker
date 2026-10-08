import { Plus, X } from 'lucide-react'
import {
  findInCatalog,
  jobSearchStatusLabels,
  seniorities,
  seniorityLabels,
  type Catalogs,
  type DetailsForm,
  type ProfileProblems,
} from './profile'
import type { Seniority } from './directory'
import { Problem } from './problem'
import { WhereToWorkFields } from './where-to-work-fields'

// The profile fields other than the Tech Stack, shared by the signup form
// and the profile editor.
export function DetailsFields({
  form,
  update,
  problems,
  catalogs,
}: {
  form: DetailsForm
  update: (changes: Partial<DetailsForm>) => void
  problems: ProfileProblems
  catalogs: Catalogs
}) {
  const toggleSeniority = (seniority: Seniority, accepted: boolean) =>
    update({
      otherSeniorities: accepted
        ? [...form.otherSeniorities, seniority]
        : form.otherSeniorities.filter((s) => s !== seniority),
    })

  return (
    <div className="form-grid">
      <p className="field">
        <label>
          First name
          <input
            value={form.firstName}
            onChange={(e) => update({ firstName: e.target.value })}
            autoComplete="given-name"
          />
        </label>
        <Problem text={problems.firstName} />
      </p>
      <p className="field">
        <label>
          Last name
          <input
            value={form.lastName}
            onChange={(e) => update({ lastName: e.target.value })}
            autoComplete="family-name"
          />
        </label>
        <Problem text={problems.lastName} />
      </p>
      <p className="field">
        <label>
          LinkedIn profile URL
          <input
            inputMode="url"
            value={form.linkedinUrl}
            onChange={(e) => update({ linkedinUrl: e.target.value })}
            placeholder="https://www.linkedin.com/in/you"
          />
        </label>
        <Problem text={problems.linkedinUrl} />
      </p>
      <p className="field">
        <label>
          Job Search Status
          <select
            value={form.jobSearchStatus ?? ''}
            onChange={(e) =>
              update({
                jobSearchStatus:
                  (e.target.value as DetailsForm['jobSearchStatus']) || null,
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

      <fieldset className="group span-2">
        <legend>Target Roles</legend>
        <datalist id="target-roles">
          {catalogs.roles.map((role) => (
            <option key={role.name} value={role.name}>
              {role.aliases.join(', ')}
            </option>
          ))}
        </datalist>
        {form.targetRoles.map((typed, index) => (
          <p key={index} className="repeat-row">
            <label className="field">
              Target Role {index + 1}
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
            </label>
            {form.targetRoles.length > 1 && (
              <button
                type="button"
                className="btn-quiet"
                onClick={() =>
                  update({
                    targetRoles: form.targetRoles.filter((_, i) => i !== index),
                  })
                }
              >
                <X size={16} aria-hidden="true" />
                Remove
              </button>
            )}
            <Resolved
              typed={typed}
              name={findInCatalog(catalogs.roles, typed)?.name}
              catalog="Role Catalog"
            />
          </p>
        ))}
        <button
          type="button"
          className="add-row"
          onClick={() => update({ targetRoles: [...form.targetRoles, ''] })}
        >
          <Plus size={16} aria-hidden="true" />
          Add another Target Role
        </button>
        <Problem text={problems.targetRoles} />
      </fieldset>

      <fieldset className="group span-2">
        <legend>Seniority</legend>
        <p className="hint">Choose one Preferred Seniority, and any others you'd accept.</p>
        <table className="seniority-table">
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

      <WhereToWorkFields form={form} update={update} problems={problems} />
    </div>
  )
}

// Shows which Catalog entry a typed name or Alias resolves to, or that it
// will be added to the Catalog.
export function Resolved({
  typed,
  name,
  catalog,
}: {
  typed: string
  name?: string
  catalog: 'Skill Catalog' | 'Role Catalog'
}) {
  if (!typed.trim()) return null
  if (!name) return <span className="resolved">New to the {catalog}</span>
  if (name === typed.trim()) return null
  return <span className="resolved">Saved as {name}</span>
}
