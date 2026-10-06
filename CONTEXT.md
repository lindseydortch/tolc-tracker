# TOLC Tracker

A directory of the members of TOLC (the Offer Letter Club) Discord server. It lets members quickly find who to refer when a recruiter reaches out with a role.

## Language

**TOLC**:
The Offer Letter Club, a Discord server for people in tech job searches.
_Avoid_: the server, the group

**Member**:
A person in the TOLC Discord server who has a profile in the tracker, identified by both their GitHub account and their Discord account.
_Avoid_: user, account

**Hidden Member**:
A Member the Admin has hidden, usually after removing them from TOLC. Their profile is kept but left out of the Directory, and they can't see it, until the Admin reactivates them.
_Avoid_: inactive member, deleted member, ex-member

**Directory**:
The list of all Members' profiles, visible only to logged-in Members. Every Member is listed regardless of Job Search Status.
_Avoid_: roster, list

**Admin**:
The TOLC server owner, the only person who can merge entries in the Skill Catalog and Role Catalog, and hide or delete Members. Profiles can be edited only by the Member who owns them, never by the Admin.
_Avoid_: moderator, mod

**Merge**:
The Admin folding a duplicate Skill or Target Role (A) into another (B). A's name and Aliases become Aliases of B, every Member using A now uses B, and A is removed. A Member who had both keeps one entry: if both filled a Stack Layer, B keeps its own and A's Stack Layer is left empty. TypeScript can only be merged into, never from a Skill that fills a Stack Layer, so the TypeScript Badge keeps working.
_Avoid_: combine, dedupe

**Referral**:
A Member passing a recruiter's role along to another Member whose Target Roles and Tech Stack fit it.
_Avoid_: match, lead

### Profile

**Target Role**:
A kind of job a Member is looking for, such as "Software Engineer" or "Product Engineer", without a level. Chosen from the Role Catalog. A Member can have several.
_Avoid_: job type, position, title

**Role Catalog**:
The shared list of Target Roles: a starter set plus any role a Member adds.
_Avoid_: role list, titles

**Seniority**:
A level a Member is looking for, such as Junior, Mid, Senior, or Staff+. Each Member has one Preferred Seniority and may have others they would also accept.
_Avoid_: level, experience

**Job Search Status**:
Where a Member is in their job search: Actively Looking, Employed and Looking, Employed and Open to Offers, or Not Looking.
_Avoid_: availability, open to work

**Tech Stack**:
The Skills a Member knows, split into Primary Skills and Secondary Skills.
_Avoid_: skills list, technologies

**Preferred Stack**:
What a Member would prefer to work with in their next role: one Skill for each Stack Layer.
_Avoid_: main stack, core stack, current stack

**Stack Layer**:
One slot in the Preferred Stack: Frontend Framework, Backend Framework, Backend Language (such as Node.js or Python), or Database. Each holds at most one Skill. TypeScript never fills a Stack Layer.
_Avoid_: category, section

**Primary Skill**:
A Skill in a Member's Preferred Stack. A Member always has at least one, so their last Primary Skill can't be removed until another takes its place.
_Avoid_: main skill, preferred skill

**Secondary Skill**:
A Skill a Member knows that is not in their Preferred Stack. A Primary Skill replaced in the Preferred Stack becomes a Secondary Skill.
_Avoid_: other skills, extras

**TypeScript Badge**:
A yes/no on a Member's profile saying whether they know TypeScript, shown on their card. It is independent of the Preferred Stack. Turning it on adds TypeScript as a Secondary Skill.
_Avoid_: TS flag, prefers TypeScript

**Link**:
A URL on a Member's profile. LinkedIn and GitHub are required. Resume, Portfolio, X, Bluesky, and Custom Links are optional.
_Avoid_: social, URL

**Custom Link**:
A Link with a label the Member writes themselves, such as a project or a talk. A Member can have several.
_Avoid_: free-form link, other link

**Skill**:
One canonical technology, such as "React", that Primary and Secondary Skills point to.
_Avoid_: tag, technology

**Skill Catalog**:
The shared list of all Skills: a starter set of common technologies plus any Skill a Member adds.
_Avoid_: skill list, taxonomy

**Alias**:
Another name that resolves to a Skill, such as "ReactJS" or "react.js" for React.
_Avoid_: synonym, variant

### Views

**Quick View**:
The Directory shown as a grid of Member cards, used to scan for someone before searching. Each card shows the Member's Discord avatar, first and last name, Discord handle, Job Search Status, Target Roles, Seniority, and Primary Skills.
_Avoid_: dashboard, home
