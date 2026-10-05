// Readers for forms sent to the server, where they can't be trusted. Each
// throws on anything of the wrong shape; the `check*` rules then decide
// whether a well-formed form is complete.
import type { StackLayer } from './directory'
import {
  jobSearchStatusLabels,
  seniorityLabels,
  stackLayerLabels,
  type DetailsForm,
  type PreferredStack,
  type ProfileForm,
} from './profile'
import { emptyLinks, optionalLinks, type LinksForm } from './profile-links'

export function parseProfileForm(input: unknown): ProfileForm {
  const read = formReader(input, 'signup form')
  const stack = read.form.preferredStack
  if (typeof stack !== 'object' || stack === null) read.fail('preferredStack')
  const preferredStack: PreferredStack = {}
  for (const [layer, name] of Object.entries(stack as object)) {
    if (name === undefined) continue
    if (typeof name !== 'string') read.fail('preferredStack')
    preferredStack[read.oneOf('preferredStack', layer, stackLayerLabels)] = name
  }
  return { ...readDetails(read), preferredStack }
}

export function parseDetailsForm(input: unknown): DetailsForm {
  return readDetails(formReader(input, 'profile details'))
}

export function parseLinksForm(input: unknown): LinksForm {
  const read = formReader(input, 'Links')
  const links = emptyLinks()
  for (const { kind } of optionalLinks) links[kind] = read.text(kind)
  links.custom = read.list('custom').map((link) => {
    const custom = formReader(link, 'Custom Link')
    return { label: custom.text('label'), url: custom.text('url') }
  })
  return links
}

export type AddSkillForm = {
  skill: string
  stackLayer: StackLayer | null
  // True once the Member agreed to replace the Skill in that Stack Layer.
  replace: boolean
}

export function parseAddSkillForm(input: unknown): AddSkillForm {
  const read = formReader(input, 'Skill')
  return {
    skill: read.text('skill'),
    stackLayer:
      read.form.stackLayer === null
        ? null
        : read.oneOf('stackLayer', read.form.stackLayer, stackLayerLabels),
    replace: read.flag('replace'),
  }
}

export function parseSkillName(input: unknown): { skill: string } {
  return { skill: formReader(input, 'Skill').text('skill') }
}

export function parseTypeScriptBadge(input: unknown): { on: boolean } {
  return { on: formReader(input, 'TypeScript Badge').flag('on') }
}

function readDetails(read: FormReader): DetailsForm {
  const { form } = read
  return {
    firstName: read.text('firstName'),
    lastName: read.text('lastName'),
    linkedinUrl: read.text('linkedinUrl'),
    jobSearchStatus:
      form.jobSearchStatus === null
        ? null
        : read.oneOf('jobSearchStatus', form.jobSearchStatus, jobSearchStatusLabels),
    targetRoles: read.list('targetRoles').map((name) =>
      typeof name === 'string' ? name : read.fail('targetRoles'),
    ),
    preferredSeniority:
      form.preferredSeniority === null
        ? null
        : read.oneOf('preferredSeniority', form.preferredSeniority, seniorityLabels),
    otherSeniorities: read.list('otherSeniorities').map((value) =>
      read.oneOf('otherSeniorities', value, seniorityLabels),
    ),
  }
}

type FormReader = ReturnType<typeof formReader>

export function formReader(input: unknown, formName: string) {
  const fail = (field: string): never => {
    throw new Error(`Malformed ${formName}: ${field}`)
  }
  if (typeof input !== 'object' || input === null) fail('not an object')
  const form = input as Record<string, unknown>
  return {
    form,
    fail,
    text: (field: string) =>
      typeof form[field] === 'string' ? form[field] : fail(field),
    flag: (field: string) =>
      typeof form[field] === 'boolean' ? form[field] : fail(field),
    list: (field: string) =>
      Array.isArray(form[field]) ? (form[field] as unknown[]) : fail(field),
    oneOf: <T extends string>(field: string, value: unknown, labels: Record<T, string>) =>
      typeof value === 'string' && Object.hasOwn(labels, value) ? (value as T) : fail(field),
  }
}
