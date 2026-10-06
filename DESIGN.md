---
name: TOLC Tracker
description: The referral index of the Offer Letter Club, drawn as a conference badge wall.
colors:
  ground: "#110f15"
  ground-raised: "#17141c"
  badge: "#1f1b25"
  badge-hi: "#29242f"
  field: "#141118"
  line: "#352e3d"
  line-strong: "#4b4356"
  ink: "#efeae3"
  ink-2: "#bdb5c4"
  ink-3: "#958d9f"
  violet: "#5a27ba"
  violet-hi: "#6c37d6"
  violet-ink: "#bba3f7"
  crimson: "#c12544"
  crimson-hi: "#d63353"
  crimson-ink: "#ff8fa3"
  apricot: "#f7ab60"
  sage: "#b0baa3"
  on-apricot: "#2a1806"
  on-sage: "#1b2014"
  on-ink-color: "#ffffff"
typography:
  display:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "2.75rem"
    fontWeight: 850
    lineHeight: 1.1
    letterSpacing: "-0.015em"
    fontVariation: "'wdth' 72"
  badge-name:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "2rem"
    fontWeight: 850
    lineHeight: 0.95
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 68"
  headline:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "1.375rem"
    fontWeight: 750
    lineHeight: 1.1
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 80"
  title:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 750
    lineHeight: 1.1
    fontVariation: "'wdth' 80"
  body:
    fontFamily: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.35
  caption:
    fontFamily: "'Atkinson Hyperlegible Next Variable', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.35
  ribbon:
    fontFamily: "'Archivo Variable', 'Arial Narrow', sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 800
    lineHeight: 1.15
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 78"
  handle:
    fontFamily: "'Atkinson Hyperlegible Mono Variable', ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "99px"
spacing:
  xs: "0.375rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.75rem"
  xl: "2.5rem"
components:
  button:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 0.9rem"
    height: "2.25rem"
  button-hover:
    backgroundColor: "{colors.badge-hi}"
    textColor: "{colors.ink}"
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-ink-color}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 0.9rem"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.violet-hi}"
    textColor: "{colors.on-ink-color}"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.crimson-ink}"
    rounded: "{rounded.sm}"
  button-danger-hover:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.on-ink-color}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
  button-lg:
    padding: "0 1.25rem"
    height: "2.875rem"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "0 0.75rem"
    height: "2.5rem"
  chip:
    backgroundColor: "{colors.badge-hi}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: "0 0.5rem"
    height: "1.5rem"
  toggle:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 0.7rem"
    height: "2rem"
  toggle-checked:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.on-ink-color}"
  badge:
    backgroundColor: "{colors.badge}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.75rem 0 0"
  ts-sticker:
    backgroundColor: "{colors.sage}"
    textColor: "{colors.on-sage}"
    rounded: "50%"
    size: "2.35rem"
  badge-photo:
    backgroundColor: "{colors.badge-hi}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.sm}"
    size: "3.25rem"
  panel:
    backgroundColor: "{colors.ground-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "1.75rem"
  nav-link:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "0 0.75rem"
    height: "2.25rem"
  nav-link-active:
    backgroundColor: "{colors.badge-hi}"
    textColor: "{colors.ink}"
  nav-progress:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.violet-ink}"
    height: "3px"
---

# Design System: TOLC Tracker

## Overview

**Creative North Star: "The Badge Wall"**

Every Member is an attendee badge hung on a violet-black wall. A badge has a punched lanyard slot at its top, the Member's Discord avatar as an ID photo beside a big condensed first name, the Discord handle in mono, a dashed perforation above its facts, and a full-strength status ribbon across its foot. The world is a conference hall after dark: dark badge stock, printed ink, lanyards in the club's violet. The pages before the Directory (sign-in, connect Discord, members only, not found) are a single blank badge hanging from a TOLC lanyard and clip.

The system is dense and operational. Lookup speed comes first, so the wall runs four columns at desktop width, the filter rail stays pinned, and every surface outside the badge is quiet: tonal violet-black panels, hairline borders, one button vocabulary. Color is saved for meaning. The four brand inks (apricot, crimson, violet, sage) appear at full strength on status ribbons and swatches, violet carries the primary action and the selected state, and apricot carries focus.

Motion is physical and small. A badge swings a few degrees from its slot on hover or focus; a badge that arrives on a page settles from a short hang. While a page loads, a thin violet strap sweeps across the top of the window. Everything is instant under reduced motion. It refuses the category default of neutral dark SaaS cards with one neon accent.

**Key Characteristics:**
- Violet-black tonal ground with badges one step lighter; depth from tone first, soft shadow second.
- Condensed heavy Archivo for names and headings; Atkinson Hyperlegible Next for everything read; Atkinson Hyperlegible Mono for Discord handles.
- Job Search Status is a color code, used identically on ribbons and filter swatches.
- Dashed rules are the badge's perforation, used for fact dividers and key-value lists.
- Swing-from-the-slot is the signature interaction.

## Colors

A dark violet-black hall lit by four printed inks, each with one job.

### Primary
- **Club Violet** (violet): the primary action fill (Search, Copy Discord handle, Save), the checked state of checkboxes, radios and filter toggles, the selection highlight, the lanyard strap, the loading bar, and the Employed and Open to Offers ribbon. Hover deepens to **Lit Violet** (violet-hi).
- **Lavender Ink** (violet-ink): inline links, the wordmark's badge mark, and the loading bar's sweep; violet made readable as text on the dark ground.

### Secondary
- **Ticket Apricot** (apricot): the focus ring, the caret, the "TOLC" in the wordmark, the Actively Looking ribbon and swatch, and the tinted confirm panel. Text on it is **Burnt Umber** (on-apricot).
- **Signal Crimson** (crimson): the Employed and Looking ribbon and swatch, the danger-button hover fill, and the error banner tint. As text, it becomes **Rose Ink** (crimson-ink), used for errors and danger-button labels. Hover fill is crimson-hi.

### Tertiary
- **Lichen Sage** (sage): the Not Looking ribbon, the TypeScript Badge sticker, saved confirmations, and the success banner tint. Text on it is **Moss Black** (on-sage).

### Neutral
- **Hall Black** (ground): the page ground, the inside of the lanyard slot, the scrollbar track.
- **Raised Hall** (ground-raised): panels that hold controls: the filter rail, form sections, merge cards, table frames.
- **Badge Stock** (badge): the badge surface and table header row. **Badge Stock Lit** (badge-hi) is the hover and active fill for buttons and nav, and the chip fill.
- **Well** (field): input and select backgrounds, a step darker than the panel they sit in.
- **Hairline** (line) and **Seam** (line-strong): structural borders and dividers; Seam outlines controls, chips and the badge perforation.
- **Badge Ink** (ink): primary text, a warm off-white. **Faded Ink** (ink-2): secondary text, labels and helper copy. **Pencil** (ink-3): fact labels, hints, placeholders and icon tints.
- **White** (on-ink-color): text on violet and crimson fills only.

### Named Rules
**The Status Ink Rule.** Each Job Search Status owns one ink everywhere: Actively Looking apricot, Employed and Looking crimson, Employed and Open to Offers violet, Not Looking sage. Ribbons and filter swatches use the same mapping; nothing else may borrow it to mean a different status.

**The Apricot Focus Rule.** Keyboard focus is always a 2px ground gap plus a 2px apricot ring (or an apricot border on fields and badges). No other focus treatment exists.

**The Ink-for-Text Rule.** Violet and crimson are fills; on dark ground their text forms are violet-ink and crimson-ink. Never set body-size text in raw violet or crimson on the ground.

## Typography

**Display Font:** Archivo Variable, condensed through its width axis (with Arial Narrow)
**Body Font:** Atkinson Hyperlegible Next Variable (with system-ui)
**Label/Mono Font:** Atkinson Hyperlegible Mono Variable (with ui-monospace), for Discord handles only

**Character:** A heavy, narrow badge-print face for names and headings over a face built for legibility. The condensed width is the voice: names pack into a badge the way they would on a printed lanyard card.

### Hierarchy
- **Display**: page titles (Directory, Edit your profile, Admin) and gate headings, at 72% width (gates and badge names go to 68%). Drops to 2rem under 720px.
- **Badge name**: the first name on every badge, tight at 0.95 line height and allowed to break anywhere. The last name sits under it in Archivo at 85% width, weight 600, 1.0625rem, in Faded Ink. On the profile page the pair steps up to 2.75rem and 1.375rem.
- **Headline**: section headings (filter rail title, form sections, profile sections, admin sections, empty states), at 80% width.
- **Title**: filter and form group legends, merge card headings, subheads, and the Stack Layer values on the profile.
- **Body**: all reading text and field values.
- **Label**: buttons, nav, field labels, hints, notes and badge fact values.
- **Caption**: badge fact terms, table headers and chips, in Pencil for terms and headers.
- **Ribbon**: the status label on the badge foot. It's uppercase with 0.06em tracking, because it's a printed ribbon.
- **Handle**: Discord handles on badges and in the top bar.

### Named Rules
**The Condensed Names Rule.** Archivo is only for names, headings, legends, the ribbon, the sticker and the wordmark, and always narrowed (68–85% width). Reading text never uses it.

**The Mono Means Handle Rule.** The mono face marks a Discord handle. Don't use it as decoration or for other data.

## Layout

The app shell is a sticky 3.75rem top bar (translucent ground with blur, a hairline bottom border) over a centered page up to 88rem wide, padded 2rem 1.5rem 4rem. Narrow pages (forms) cap at 52rem.

Quick View is a two-column grid: an 18.5rem sticky filter rail and the badge wall, with a 2.25rem gap. The wall auto-fills 15.25rem minimum columns with 1.75rem row and 1rem column gaps, which gives four columns at 1440. Badges in a row stretch to equal height, so their ribbons line up. The profile is a 21rem sticky badge column beside a 3rem gap and the detail sections (2.5rem apart). Forms use two-column grids (1.25rem gap) inside raised sections.

Breakpoints: at 960px the rail folds into a full-width "Filters" disclosure above the wall, and the profile stacks with the badge capped at 22rem. At 720px the wall goes to one column, form grids collapse, nav labels hide to icons, the signed-in name hides, and page padding tightens to 1.25rem 1rem.

Spacing runs in rem steps: 0.375 inside fields, 0.75 between group items, 1.25 between fields and panel padding on phones, 1.75 for form section padding and wall rows, 2.5 to 3 between major sections.

## Elevation & Depth

Depth is tonal first: ground, then raised panels, then badges, each one step lighter, with hairline borders. Shadow belongs to the badge only, because a badge is a physical card hanging off the wall. Panels, rails and tables stay flat.

### Shadow Vocabulary
- **Badge rest** (`box-shadow: 0 1px 0 rgb(255 255 255 / 0.04) inset, 0 6px 18px -8px rgb(0 0 0 / 0.7)`): every badge at rest; a top-edge highlight and a short drop.
- **Badge lifted** (`box-shadow: 0 1px 0 rgb(255 255 255 / 0.06) inset, 0 18px 32px -14px rgb(0 0 0 / 0.85)`): a badge on hover or focus, while it swings.
- **Slot punch** (`box-shadow: inset 0 1px 2px rgb(0 0 0 / 0.8), 0 1px 0 rgb(255 255 255 / 0.05)`): the punched lanyard slot cut into the badge top.
- **Sticker** (`box-shadow: 0 2px 6px -1px rgb(0 0 0 / 0.6)`): the TypeScript Badge sticker sitting on the badge.

### Named Rules
**The Only Cards Hang Rule.** Shadows exist only on the badge and things stuck to it. Any other container is flat, tonal and bordered.

## Shapes

Three radii: gently rounded controls (6px) for buttons, inputs, nav and links; 10px for banners and confirm panels; 16px for badges, the rail, form sections, merge cards and table frames. Chips, filter toggles and the slot are full pills. The TypeScript sticker is a circle, rotated 9 degrees. Status swatches are 2px squares. The badge's internal divisions are dashed (the perforation), and so are the profile's key-value lists and the empty state frame. Elsewhere, borders are solid 1px hairlines.

## Components

### Buttons
One vocabulary everywhere, compact and outlined.
- **Shape:** gently rounded (6px), 2.25rem tall, 0.9rem side padding, label weight 600 with an optional 16px leading icon.
- **Default:** transparent with a Seam outline and Badge Ink text. Hover fills Badge Stock Lit and lifts the border to Pencil, over 160ms with the expo-out ease.
- **Primary:** Club Violet fill and border, white text; hover goes to Lit Violet. One primary action per form or panel.
- **Danger:** a crimson outline at 70% with Rose Ink text. Hover fills solid crimson with white text.
- **Quiet:** no border and Faded Ink text, for Sign out and minor actions.
- **Large:** 2.875rem tall, used full-width on gates and for Copy Discord handle. **Icon:** a 2rem square.
- **Disabled:** 45% opacity with no hover change.

### Chips
- **Style:** Skill chips are 1.5rem pills filled Badge Stock Lit with a Seam outline and caption text. The removable variant carries a 1.25rem round remove button.
- **Filter toggles:** 2rem pills around a real, invisible checkbox. Unchecked, they're outlined with Faded Ink text. Checked, they fill Club Violet with white text. Focus puts the apricot ring on the whole pill. Job Search Status toggles lead with a status-ink square swatch.

### Cards / Containers
- **Badge:** see the signature component below.
- **Panels** (filter rail, form sections, merge cards, table frames): 16px corners, Raised Hall fill, Hairline border, flat. Padding is 1.25rem (rail, merge) or 1.75rem (forms, dropping to 1.25rem on phones).
- **Banners:** 10px corners with a tinted fill: crimson at 16% into Badge Stock for errors, or sage at 12% for success, each with a matching 16px icon. **Confirm** panels mix apricot at 10%.
- **Empty state:** a dashed Seam frame around a tilted, dashed blank badge outline with its slot.

### Inputs / Fields
- **Style:** Well fill, Seam outline, 6px corners, 2.5rem tall, body text. Selects use a Faded Ink chevron. Labels sit above in label weight 600, Faded Ink, with a 0.375rem gap. Hints are in Pencil.
- **Hover / Focus:** hover lifts the border to Pencil; focus turns the border apricot and adds the apricot ring.
- **Checkbox / Radio:** 1.125rem custom boxes with a Pencil outline that fill violet with a white check or dot, which scales in over 120ms.
- **Error:** inline Rose Ink text with an alert icon (weight 600). Saved confirmations use sage text.

### Navigation
- **Top bar:** the wordmark (badge mark in Lavender Ink, "TOLC" in apricot, Archivo at 72% width, weight 850) on the left, then icon-plus-label links. Links are Faded Ink at rest. Hover fills Badge Stock, and the current page fills Badge Stock Lit with Badge Ink text. The signed-in name and handle sit right, followed by a quiet Sign out. Under 720px, link labels hide visually and only the icons show.
- **Back link:** a small Faded Ink arrow link above page content.
- **Loading bar:** a 3px Club Violet strap fixed across the top of the window, above the top bar, with a 40% Lavender Ink segment sweeping left to right every 1100ms. It shows only when a page takes over 200ms to load, stays at least 300ms once shown, and fades in over 160ms. Under reduced motion the whole strap turns Lavender Ink instead of sweeping. The old page stays on screen underneath. A status region announces "Loading page" to screen readers.

### The Member Badge (signature)
The one card in the system. It has 16px corners, a Badge Stock fill, a Hairline border and the badge rest shadow, with 1.75rem of top padding that holds the punched slot: a 2.5rem pill cut in Hall Black, centered. Inside, from top to bottom, are the ID photo beside the condensed first name over the last name, the mono Discord handle with the Discord mark, a dashed perforation, a fact list (caption terms in Pencil over label values: Target Roles, Seniority, Primary Skills as chips), and the full-width status ribbon in the status ink. The ID photo is the Member's Discord avatar: a plain image, not a link, 3.25rem square (4.5rem on the profile page) with 6px corners and a Seam border. If it fails to load, the Member's initials in condensed Archivo, Faded Ink on Badge Stock Lit, fill the same square. The TypeScript Badge is a sage circular "TS" sticker, rotated 9 degrees, top right. On hover or focus the badge lifts its shadow, brightens its border (apricot on focus) and swings around its slot (rotate -2.4°, 1.5°, -0.8°, 0.35°, 0 over 1100ms). On the profile and gates, the badge settles in from a -3° hang and hangs from a violet lanyard strap and clip.

### Gate
The pages before the Directory: a 24rem column with a violet lanyard strap (printed with "TOLC" vertically at 55% white) and a Pencil clip, holding one badge with the heading, a line of Faded Ink copy, and full-width large buttons.

## Do's and Don'ts

### Do:
- **Do** draw every Member as the full badge (slot, condensed name, mono handle, dashed perforation, status ribbon) wherever a Member is summarized.
- **Do** map Job Search Status to its ink exactly: apricot, crimson, violet, sage, in that order of statuses, on ribbons and swatches alike.
- **Do** use Club Violet for the single primary action and for every checked or selected state.
- **Do** show focus as the apricot ring (`0 0 0 2px` ground, `0 0 0 4px` apricot), and nothing else.
- **Do** keep panels tonal and flat (Raised Hall, Hairline border, 16px corners), and save shadow for the badge.
- **Do** use dashed Seam rules for badge facts and key-value lists, and solid Hairline rules for structure.
- **Do** keep the swing and hang motions small (under 3 degrees) and pivoted at the slot, with reduced motion making them instant.
- **Do** keep the loading bar's sweep the only looping motion, and only while a page is loading.

### Don't:
- **Don't** build neutral dark SaaS cards with one neon accent. The badge is the card.
- **Don't** use Archivo for reading text, or the mono face for anything but Discord handles.
- **Don't** reuse a status ink to mean something else on a Member surface.
- **Don't** set body text in raw violet or crimson on the ground. Use violet-ink and crimson-ink.
- **Don't** add uppercase tracked labels outside the status ribbon. The ribbon is the only printed-caps element.
- **Don't** add shadows to panels, rails, tables or buttons.
