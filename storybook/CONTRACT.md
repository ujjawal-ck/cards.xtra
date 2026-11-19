# Storybook contract (Cards.xtra)

Last updated: 2026-11-19 [claude]. Owner: the main session. Agents follow this file. Agents do not edit it.

## 1. Goal
One Storybook for the Cards.xtra design system and every user flow, with its states.
The page shape copies gc-ds (https://gc-ds.surge.sh/docs/components/tab-bar.html): sidebar groups, "pick the right one" table, playground, anatomy, do and don't.
The colours, type and spacing come from `src/tokens` only. Do not use gc-ds colours.

## 2. Sources (read before you write)
- `storybook/audit/fe-inventory.md`: props, providers, fixtures, web risks for each component and screen.
- `storybook/audit/pm-flows.md`: the sidebar tree (section 3), the flows and steps (sections 1 and 3.6), the risks R1 to R20.
- `storybook/audit/ux-states.md`: the state matrix per screen, with EXISTS file:line and MISSING proposals with copy.
- Working examples: `stories/_spike/*.stories.tsx` (atom, screen with 4 states, sheet opened on mount).

## 3. Hard rules
1. No network. Screens render only through `ScreenHarness` (`storybook/harness`). Never call `fetch` yourself. Never set a real host.
2. No personal data. No real phone, email, name or order id. Use `98XXXXXX10`, `user@example.com`, `Test User`, `CKORDER0001`.
3. Write cashback rates as "X%" in copy you invent. Real values that come from a fixture file can stay.
4. Do not edit any file in `src/`, `App.js`, `package.json` (root), `tsconfig.json` (root) or `bff/`. If a component needs a change to render, write it in your report. Do not fix it.
5. Do not edit `storybook/.storybook/*`, `storybook/harness/*`, `storybook/blocks/*`, `storybook/fixtures/*`, `storybook/mocks/*` or this file. Only the harness agent owns `harness/` and `fixtures/`.
6. Write only inside the folders that your brief gives you. Do not commit. Do not run `git add`, `git stash`, `git checkout` or `git reset`.
7. No new colour, size or font value. Use `colors.*`, `spacing`, `radius`, `typography` from `src/tokens`. Docs blocks already use the tokens.
8. Do not settle product questions. A proposed state shows one design. Write the open question in the story `parameters.docs.description.story`.

## 4. File layout
```
stories/
  introduction.mdx
  foundations/<page>.mdx and <page>.stories.tsx
  components/<family-slug>/<family-slug>.mdx          family overview page (gc-ds shape)
  components/<family-slug>/<Component>.stories.tsx    one file per component
  patterns/<pattern-slug>.mdx (+ .stories.tsx if it renders)
  flows/<nn-flow-slug>/<nn-flow-slug>.mdx             flow overview: steps and state matrix
  flows/<nn-flow-slug>/<Step>.stories.tsx              one file per step, one story per state
```
Old files in `stories/atoms`, `stories/molecules`, `stories/organisms` and `stories/Foundations.stories.tsx` are replaced. The writer who owns the component deletes the old file with `rm` after the new one builds.

## 5. Titles (sidebar)
- `Introduction`
- `Foundations/<Page>`: Explaining tokens, Colors, Typography, Values, Sizes, Shadows, Icons, Imagery, Animations.
- `Components/<Family>/<Component>`. Family names are in `pm-flows.md` section 3.3. Use them exactly.
- `Components/<Family>/Overview` for the family MDX page.
- `Patterns/<Pattern>`. Names in `pm-flows.md` section 3.5.
- `Flows/<n> <Flow name>/<Step>`. Names in `pm-flows.md` section 3.6, for example `Flows/7 Earnings and withdraw/Verify OTP`.
- `Flows/<n> <Flow name>/Overview` for the flow MDX page.

## 6. Tags (every story has exactly one)
| Tag | Meaning | Rule |
|---|---|---|
| `live` | The app renders this today | Render the real component or screen. Put the source in `parameters.source: 'src/...tsx:LINE'` |
| `proposed` | Designed here, not in the app | Compose it from existing DS components in the story file. The preview adds a "PROPOSED" ribbon. Use the copy in `ux-states.md` |
| `hidden` | In code, not reachable (feature flag or decision) | Render the real screen. Name the decision in the description |
| `demo` | Reachable but fake (no API behind it) | Render the real screen. Say what is fake |
Set it with `tags: ['live']` (plus `'autodocs'` on component files). Proposed stories never import from `src/screens`.

## 7. Component story shape
```tsx
import type { Meta, StoryObj } from '@storybook/react-native-web-vite';
import { Badge } from '../../../src/atoms/Badge';
const meta = {
  title: 'Components/Badge and Tag/Badge',
  component: Badge,
  tags: ['autodocs', 'live'],
  parameters: { source: 'src/atoms/Badge.tsx', docs: { description: { component: 'One line: the job of this part.' } } },
  argTypes: { /* every variant / size / state prop, with its real options */ },
  args: { /* realistic defaults */ },
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Playground: Story = {};
export const Variants: Story = { render: () => (/* every variant side by side, labelled */) };
export const States: Story = { render: () => (/* default, pressed/disabled/loading/error as they apply */) };
```
- Every story renders without a crash, with realistic Indian data (₹ amounts with Indian grouping, real card and store names).
- Sheets: present them on mount with a ref, as in `stories/_spike/Sheet.stories.tsx`. Use `parameters.layout: 'fullscreen'`.
- A component that needs navigation, query or auth: wrap it with `ComponentHarness` from `storybook/harness` (the harness agent adds it). Until it exists, skip that component and list it in your report.

## 8. Family overview page (MDX), gc-ds shape
```mdx
import { Meta } from '@storybook/addon-docs/blocks';
import { PageHeader, PickTable, Anatomy, DoDont } from '../../../storybook/blocks';
<Meta title="Components/Badge and Tag/Overview" />
<PageHeader title="Badge and Tag" meta="10 components · atoms">What the family is for, in 2 to 3 lines.</PageHeader>
<PickTable rows={[{ building: '...', use: 'StatusBadge', tier: 'atom', story: 'components-badge-and-tag-statusbadge--docs' }]} />
## Anatomy  (Anatomy block for the main part: each part and its token)
## Composition  (which part goes inside which; rules from code comments and docs/decision.md)
<DoDont dos={[...]} donts={[...]} />
```
A PickTable is required for the families marked PICK in `pm-flows.md` 3.3 and 3.4.

## 9. Flow overview page (MDX)
`PageHeader`, then the ordered steps as an ASCII flow in a code block, then one `StateMatrix` per step (rows link to the stories), then "Open questions" from `pm-flows.md` section 4 and the risks for this flow.

## 10. Done check for every writer
1. `cd storybook && npm run typecheck`: no error in your files.
2. Build only your files: `cd storybook && SB_STORIES='../../stories/<your-folder>/**/*.mdx,../../stories/<your-folder>/**/*.stories.tsx' npx storybook build -c .storybook -o "$TMPDIR/sb-<your-agent-name>"`. It must print `Output directory`. Do not write to `storybook/dist`. MDX that links to stories outside your folder may warn; that is fine.
3. Report: files written, files deleted, components or states skipped and why, component bugs seen (do not fix).
