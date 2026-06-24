# Hands-On Claude Code Exercise for QA Automation Engineers — Selenium .NET

**Track:** QA Automation Engineers · **Duration:** ~4 hours + optional extras · **Style:** Individual or pairs

> **What you'll build:** a Selenium WebDriver test suite **in C#/.NET** that drives the **HorseWorld** web app end-to-end, plus a thin API-test layer underneath it — using Claude Code to do the heavy lifting while you stay in charge.

---

## The system under test — HorseWorld

The app lives in a **separate repo** (`claudeworkshop-day_5_demo_auto_app`). You do **not** edit it — it's the target. This repo (`claudeworkshop-day_5_demo_auto_tests`) starts almost empty; you build the test suite here from scratch.

HorseWorld is a small full-stack demo with **no database** (all data is hardcoded in memory, so there is nothing to provision):

- **Backend** — ASP.NET Core 8 Web API (`HorseApp.Api`), runs at **http://localhost:7070**
- **Frontend** — Vite + React 18 + TypeScript SPA, runs at **http://localhost:3737** (proxies `/api` to the backend)

**Three features** — your test targets:

| Feature | What it does | Notable UI states |
|---|---|---|
| 📖 **Breed Encyclopedia** | Browse 12 breed cards → click for a detail overlay. Second tab is an **Identification Quiz**: a mystery description with 4 options, instant feedback, running score, "Next question". | async "Loading breeds…", detail overlay open/close, random question, correct/incorrect styling |
| ✨ **Name Generator** | Pick a **style** (elegant/wild/mythical/celtic/nature) and **gender** (male/female/neutral) → generates 5 names with copy buttons. | "Generating…" button state, async result cards |
| 🐴 **Personality Quiz** | Answer 8 questions → "Which horse breed are you?" result with retake. | progress bar, multi-step flow, "Calculating your breed…" |

**API surface** (the test layer underneath Selenium):

- `GET /api/breeds`, `GET /api/breeds/{id}` (`404` if missing), `GET /api/breeds/quiz/question`, `POST /api/breeds/quiz/answer`
- `GET /api/names/generate?style=&gender=`, `GET /api/names/options`
- `GET /api/personality/questions`, `POST /api/personality/result` (`400` if no answers)

**Real quirks you'll discover** (planted by the app, not by us — these are what make the lab honest):

- The frontend has **no `data-testid` or stable hooks** — every element is reachable only by class name or visible text. Building resilient locators is the first real QA decision.
- `GET /api/names/generate` **silently falls back** to `nature`/`neutral` for any invalid `style`/`gender` and still returns `200`. Is that a bug or a feature? Your test has to take a position.
- The Identification Quiz question is **random** — a naive test that assumes a fixed answer is already flaky.
- Several flows are **async** (button text flips to "Generating…", results appear a beat later) — the perfect trap for `Thread.Sleep`.

---

### Concept mapping — same Claude Code skills, QA-on-Selenium context

| Part | Concepts | QA-specific anchor |
|---|---|---|
| 0 — Setup | Setup check · Git safety net · ground rules | Run HorseWorld; scaffold the .NET test solution |
| 1 — Onboard & harness | Precise prompting · Plan mode · `/init` · CLAUDE.md · `@import` · Permissions · Context mgmt · Mermaid diagram | Map the app's UI + API surface; diagram a user journey |
| 2 — Ship & debug | Agentic loop · Page Object Model · Atlassian Rovo MCP · Zephyr skill · Hooks · `/rewind` · Red→green debugging · Git & PR | Write Selenium tests, automate a Zephyr case (QA-2730), fix a flaky test, generate a CI pipeline |
| 3 — Team toolkit | Skills · Slash commands · Hooks (Post + PreToolUse) | Skill for new page-object recipes, command for test review, hook for auto-run |
| 4 — Sub-agents | Sequential + parallel agents · Model selection & cost | Page-object author · test-writer · QA reviewer |
| 5 — Bonus | Playwright MCP · live-browser exploration · framework comparison | Why Claude is stronger with Playwright; same test, no waits/locators pain |
| Optional | GitHub MCP · Azure DevOps pipeline · Headless mode · Plugins · API tests | Full CI gate, cross-browser grid, API-layer suite |

---

## Part 0 — Setup & ground rules (10 min)

**Get the app running first** (two terminals, in the `..._auto_app` repo):

```bash
# terminal 1 — backend
dotnet run --project src/HorseApp.Api --urls "http://localhost:7070"

# terminal 2 — frontend
cd frontend && npm install && npm run dev      # serves http://localhost:3737
```

Open **http://localhost:3737** and click through all three features once by hand. That manual pass is your ground truth — you can't automate what you haven't seen.

**In the test repo**, create a feature branch (`qa-auto-workshop`) and confirm the toolchain:

```bash
dotnet --version          # .NET 8 SDK
claude --version
```

**Three rules:**
- Never paste credentials, tokens, or real environment URLs into a prompt.
- Never `--dangerously-skip-permissions`.
- Always read the diff before accepting. A Selenium test that passes because its locator silently matched the wrong element is worse than no test at all.

**Commands to lean on:** `/help`, `/plan`, `/rewind`, `/clear`, `/compact`, `/context`, `/usage`, `/init`, `/memory`, `Esc`, `Shift+Tab`, `/btw`.

---

## Part 1 — Onboard and harness the repo (55 min)

### 1.1 — Get oriented, then diagram a journey (10 min)

Open Claude Code in the **test repo** root (the app repo is alongside it, so Claude can read the app source for context). Precise prompt:

```
Read the HorseWorld frontend in ../claudeworkshop-day_5_demo_auto_app/frontend/src
and its API in .../src/HorseApp.Api. In 3 bullets: the three features,
the URL/port each runs on, and — for the Name Generator specifically —
how a click flows from the React button through /api/names/generate
and back to the rendered name cards. Note any element that has NO stable
selector (no id, no data-testid). Don't change anything.
```

**What they should find (and couldn't have guessed cold):** there is **not a single `data-testid`** in the app. Every locator they write will hang off a CSS class (`.gen-btn`, `.name-card`, `.pill`) or visible text — which is exactly the fragility a real QA suite has to manage.

Turn one journey into a diagram:

```
Create .temp/name-generator-journey.md with a Mermaid sequence diagram
of the Name Generator flow: user clicks a style pill → clicks Generate
→ POST-less GET /api/names/generate?style=&gender= → 5 name cards render.
Mark the async "Generating…" state as the point a test must wait on.
```

**Acceptance:** diagram renders in Markdown preview and flags the async wait point.

### 1.2 — Critique the testability of the app — no code yet (10 min)

```
You're about to write Selenium tests against this frontend.
List the testability risks: elements with no stable locator, async
states that will cause flakiness, and any non-deterministic behaviour
(e.g. the random identification quiz). For each: where it is, why it's
risky, and the locator/wait strategy you'd use. Don't write code yet.
```

**Issues Claude should surface:** class-only locators across all three pages; the "Generating…" / "Calculating your breed…" async gaps; the **random** quiz question; the `/api/names/generate` silent fallback on bad input.

Persist the findings:

```
Save these risks to .temp/testability-notes.md
```

> `.temp/` is scratch space (notes, plans, PR drafts) and must not be committed. Git-ignore it now: *"Add `.temp/` to `.gitignore`, creating the file if it doesn't exist."*

Then raise them as work items — this is where the Atlassian Rovo MCP earns its keep.

**First, connect the Atlassian Rovo MCP** (one-time, ~2 min):

```bash
# Add the official Atlassian Remote MCP server (SSE transport)
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
```

Then authenticate and confirm it's live:

```
/mcp
```

- Select **atlassian** → **Authenticate**. A browser opens — log in to your Atlassian account and **Allow** access; Claude Code stores the OAuth token.
- After it reconnects, `/mcp` should show **atlassian — connected** with the Jira/Confluence tools available.
- If your org has more than one site, the first call will ask which Atlassian site (cloud id) to use — pick the one that hosts the **NOVA** project.

> Facilitator note: participants need a Jira account on a site that has the **NOVA** project (or swap in your own project key). No account? Skip the ticket-creation step below.

Now create the tickets:

```
Using the Atlassian Rovo MCP, create a Jira ticket in project NOVA for each
testability risk in .temp/testability-notes.md. For each: a clear summary,
a description with where it is / why it's risky / the locator-or-wait
strategy to mitigate, and label them `QAAutoTestability`. Show me the ticket
keys, and add each key next to its risk in .temp/testability-notes.md.
```

**Acceptance:** `.temp/testability-notes.md` lists each risk with its Jira key, and the tickets exist in NOVA under the `QAAutoTestability` label. You'll reference both through Part 2.

### 1.3 — Plan mode: look before you leap (10 min)

```
/plan

I want to stand up a .NET Selenium + NUnit test solution for HorseWorld
using the Page Object Model. Plan it with these constraints:

- UI only for now — leave room for a separate tests/HorseWorld.ApiTests
  project we'll add later, but don't plan it yet.
- Keep it to a single tests/HorseWorld.UITests project — Pages/, Tests/,
  and a Support/ folder with a DriverFactory and a BaseTest fixture.
- Use Selenium Manager for the driver, headless Chrome by default,
  base URL from an env var.
- Sequence the UI coverage ONE FEATURE AT A TIME — Name Generator first,
  then Personality Quiz, then Breed Encyclopedia. Each feature: page object
  → tests → green before starting the next.
- Also tell me what to capture in CLAUDE.md so a teammate writes page
  objects the same way I do.
```

**Acceptance:** the plan covers the **UI-only** structure, the CLAUDE.md notes, and a **feature-by-feature delivery order** (each feature: page object → tests → green before the next); the API-test layer is explicitly deferred (it lands in 2.3); **no project files exist yet**. Participants shape the plan before any scaffolding is written — the plan/thinking separation is the lesson.

### 1.4 — Make context permanent in CLAUDE.md (15 min)

There's no `CLAUDE.md` yet — create one. Run `/init` and review. Keep an `@import .claude/qa-standards.md` line (team conventions — locator strategy, wait strategy, naming, no `Thread.Sleep` — kept separate from project facts) and section headings: `App Under Test`, `Test Architecture`, `Page Object Conventions`, `Locator & Wait Strategy`.

If `/init` is thin, fill it deliberately:

```
Fill the App Under Test, Test Architecture, and Locator & Wait Strategy
sections of CLAUDE.md. Factual only — confirmed by reading the code.
Capture:
- the two URLs (frontend 3737, backend 7070) and that the app has no DB
- that there are NO data-testid hooks, so page objects use CSS-class
  and text locators, centralised in Pages/ — never inline in tests
- the standard wait pattern: WebDriverWait + ExpectedConditions,
  never Thread.Sleep
- the AAA structure and MethodName_Scenario_ExpectedResult test naming
```

Review and correct. Then prove it loads after a wipe:

```
/clear

When I write a Selenium test for HorseWorld, where do locators live
and how do I wait for the name results to appear?
```

**Acceptance:** Claude answers "in the page object, using WebDriverWait, never Thread.Sleep" from `CLAUDE.md` alone.

### 1.5 — Permissions are a hard rule, not advice (5 min)

Set up `.claude/settings.json` with a `deny` on the app repo so Claude can read it but never modify the system under test. Then try to cross the line:

```
Add a data-testid to ../claudeworkshop-day_5_demo_auto_app/frontend/src/pages/NameGenerator.tsx
```

**Acceptance:** blocked by the `deny` rule. Discussion point: it's tempting to "just add a test id to the app," but in a real engagement the app is owned by another team — your suite has to survive against the UI **as shipped**, not a version you patched.

### 1.6 — Wire up two MCP servers — and pick the right doc source (5 min)

No single docs MCP covers everything, so connect two and learn which answers which question:

- **Microsoft Learn MCP** — serves `learn.microsoft.com`: the right tool for **.NET**, **Azure DevOps** (you'll use it in 2.7), and **Playwright for .NET** (Microsoft-owned, Part 5). It does **not** cover Selenium.
- **Context7 MCP** — up-to-date docs for thousands of libraries, **Selenium included**:

```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

Confirm both with `/mcp`, then ask each in its own territory.

**Microsoft-owned territory — Microsoft Learn MCP:**

```
Using the microsoft-docs MCP, look up how to publish TRX test results
in an Azure DevOps pipeline with the PublishTestResults task.
Summarise the YAML we'd need.
```

**Selenium territory — Context7 MCP:**

```
Using the Context7 MCP, pull the Selenium .NET docs and look up explicit
waits in C#: WebDriverWait with ExpectedConditions vs implicit waits, and
why mixing the two is dangerous. Summarise the pattern we should standardise on.
```

**Acceptance:** `/mcp` shows both `microsoft-docs` and `context7` connected; the Azure DevOps question is answered from Microsoft Learn and the Selenium question from Context7. The takeaway: **match the doc source to the library** — an MCP is only as good as the docs behind it.

---

## Part 2 — Ship a test suite, then fix a flaky test (80 min)

**Goal:** run the full agentic loop twice — once to *build real page objects + tests*, once to *debug and de-flake a test*. A hook runs `dotnet test` on every test-file edit, so red→green is immediate.

### 2.1 — Plan the first feature's coverage (10 min)

Optional Jira start (Atlassian Rovo MCP) — facilitator provides a throwaway `NOVA-####` story: *"Add automated UI coverage for the Name Generator."*

Without Jira, prompt directly:

```
/plan

Plan Selenium UI coverage for the Name Generator page:
- a NameGeneratorPage page object (style pills, gender pills, Generate
  button, name cards, copy buttons) with WebDriverWait-based accessors
- tests: generates exactly 5 names; switching style changes the result;
  the Generate button shows "Generating…" then settles; Copy works
List every file to create before writing a line of code.
```

Steer: *"Page object first, then tests — same order we'd build it manually."*

**Acceptance:** plan separates the page object from the tests; participants approve.

### 2.2 — Build it (20 min)

#### 2.2.1 — The Support layer + first page object

```
Create the Support layer:
- DriverFactory: headless Chrome via Selenium Manager, 1280x900 window,
  base URL from HORSEWORLD_URL env var (default http://localhost:3737)
- BaseTest: NUnit [SetUp]/[TearDown] that opens and quits the driver
Then create Pages/NameGeneratorPage.cs with WebDriverWait-based accessors
for the style pills, gender pills, Generate button, and name cards.
No tests yet.
```

> Commit checkpoint. Then `/clear`.

#### 2.2.2 — The tests

```
Add Tests/NameGeneratorTests.cs using NameGeneratorPage and our CLAUDE.md
conventions:
- Generate_DefaultSelection_ReturnsFiveNames
- Generate_MythicalFemale_ReturnsFiveNames
- Generate_ShowsGeneratingState_ThenSettles (wait on the button text)
- Copy_FirstName_ShowsCopiedIndicator
Follow the AAA + naming conventions from CLAUDE.md. Use explicit waits.
```

**Watch the PostToolUse hook fire** `dotnet test` when the file is saved. If red, let Claude self-correct from the hook output.

> Commit checkpoint.

#### 2.2.3 — Second feature: the Personality Quiz flow

```
Add Pages/PersonalityQuizPage.cs and Tests/PersonalityQuizTests.cs:
- a page object that answers question N by clicking the first option and
  waits for the next question (progress bar advances) or the result card
- a test that completes all 8 questions and asserts a breed result renders
- a test that the Retake button resets to question 1
Wait on the "Calculating your breed…" state before asserting the result.
```

> Commit checkpoint.

### 2.3 — API assertion layer (10 min)

The QA-specific layer beneath the UI — assert the backend contract directly so a UI failure can be triaged as "UI vs API":

```
Add a second project tests/HorseWorld.ApiTests (NUnit + HttpClient,
base URL http://localhost:7070):
- GET /api/breeds returns 12 summaries
- GET /api/breeds/{id} returns 404 for an unknown id
- POST /api/personality/result with an empty answers array returns 400
- GET /api/names/generate?style=mythical&gender=female returns 5 names
Centralise the HttpClient setup in a base fixture.
```

**Acceptance:** API tests pass and document the real contract — including the `404` and `400` edge cases.

### 2.4 — Document the silent-fallback behaviour (15 min)

From `.temp/testability-notes.md`: `/api/names/generate` returns `200` even for garbage input. Pin the **actual** behaviour down with a test, and flag it:

```
Write an API test that sends style=banana&gender=purple to
/api/names/generate and asserts the ACTUAL current behaviour
(200 with 5 valid names — it silently falls back to nature/neutral).
Name it so it's obvious this documents a quirk, and add a code comment:
"// Documents current behaviour; arguably should be 400 — see testability-notes".
Don't change the app.
```

**Acceptance:** a passing test that captures real behaviour, with a comment marking it as a candidate bug. Discussion: a test that encodes a quirk is fine **as long as it says so** — silent acceptance is how bugs become "expected."

### 2.5 — The debugging loop on a flaky test (10 min)

Deliberately introduce flakiness, then fix it properly — the core QA skill:

```
Add a quick test for the Identification Quiz that loads a question and
clicks the first option, using Thread.Sleep(500) before reading the
feedback. Run it a few times.
```

It'll pass sometimes and fail others (slow render, or the random question). Surface the cause:

```
This test is flaky. Explain exactly why — the Thread.Sleep race AND the
random question — then fix it: replace Thread.Sleep with WebDriverWait on
the feedback element, and assert on the score incrementing rather than a
specific right/wrong outcome (since the question is random). Confirm it's
green across 5 consecutive runs.
```

**Acceptance:** the test is deterministic across repeated runs; no `Thread.Sleep` remains; the assertion no longer depends on the random answer.

> Commit. Draft a PR description to `.temp/pr-description.md`.
> Optional Jira close: transition the story and comment a summary of coverage added.

### 2.6 — Automate an existing manual test case from Zephyr — QA-2730 (15 min)

This is the most realistic QA task of the day: take a **manual test case that already lives in the test-management system** and turn it into automation that reports its own result back. The case is [QA-2730](https://anthonynolan.atlassian.net/browse/QA-2730) in Zephyr.

> **Setup (facilitator-provided):** a `zephyr` skill at `.claude/skills/zephyr/` that calls the Zephyr API for test-case steps and posts test executions. The Atlassian Rovo MCP (connected in 1.2) covers the Jira-issue side.

**Fill in the skill's `.env`** (one-time). Copy `.claude/skills/zephyr/.env.example` to `.claude/skills/zephyr/.env` — it's already git-ignored, **never commit it** — and set:

```bash
# Which Zephyr product you're on — uncomment one block.

# --- Zephyr Scale (TM4J) Cloud ---
# Get the token in Jira: Apps → Zephyr Scale → top-right ⚙ → "API access tokens" → Create.
ZEPHYR_PRODUCT=scale
ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2
ZEPHYR_API_TOKEN=          # paste the Zephyr Scale token (a single bearer token)

# --- Zephyr Squad Cloud (only if your project uses Squad instead) ---
# Generate keys in Jira: Apps → Zephyr Squad → "Zephyr Squad API keys".
# ZEPHYR_PRODUCT=squad
# ZEPHYR_BASE_URL=https://prod-api.zephyr4jiracloud.com/connect
# ZEPHYR_ACCESS_KEY=
# ZEPHYR_SECRET_KEY=
# ZEPHYR_ACCOUNT_ID=        # your Atlassian account id (Profile → account settings)

# Jira context — used to resolve the issue/project the case belongs to.
JIRA_BASE_URL=https://anthonynolan.atlassian.net
JIRA_PROJECT_KEY=QA
```

> Which one? If QA-2730's test steps live under a **"Test Script / Steps"** panel added by **Zephyr Scale**, use the `scale` block (single bearer token — simplest). If they're under a **Zephyr Squad** "Test Details" panel, use the `squad` block (access key + secret + account id). Not sure → ask the facilitator, or run step 1 below with the `scale` block first; if the skill returns 401/empty steps, switch to `squad`.

**1. Pull the test case.** Don't guess what QA-2730 covers — fetch it:

```
Fetch QA-2730. Use the Atlassian Rovo MCP for the issue summary and
description, and the zephyr skill for the structured manual test steps
(step / test data / expected result). Lay them out as a numbered table,
and tell me which HorseWorld feature it exercises. Don't write code yet.
```

**2. Map manual steps → automated steps.** Reuse the page object for whichever feature it targets:

```
Turn QA-2730 into a Selenium test in tests/HorseWorld.UITests, reusing the
existing page object for that feature (create one only if it doesn't exist).
Map each manual step to an action and each "expected result" to an assertion
— keep the mapping traceable: a // QA-2730 step N comment above each block.
Follow our CLAUDE.md conventions (explicit waits, no Thread.Sleep). Run it.
```

**3. Create the `[Auto]` tracking ticket — describing the ACTUAL automated steps.** Don't touch the original, and don't just copy its manual script. Generate the description **from the test you just wrote**, so it reflects what the automation really does:

```
Using the Atlassian Rovo MCP, create a new Jira issue in project QA:
- summary: "[Auto] " + QA-2730's summary
- description: a numbered list of the ACTUAL steps the Selenium test performs
  — derived from the test code you just wrote, not copied from QA-2730. Each
  line = the concrete action (navigate, click, select, type) and the
  assertion that follows (e.g. "Assert 5 name cards render"). Plain text in
  the DESCRIPTION field, NOT Zephyr test steps.
- link it to QA-2730 with a "Relates to" issue link
Show me the new issue key.
```

**4. Add the execution automatically.** Once green, record the run against the `[Auto]` ticket:

```
The test is green. Using the zephyr skill, add a Pass test execution against
the [Auto] ticket, with the run timestamp and a note naming the automated
test. Show me the execution key it created.
```

**Acceptance:** a new **`[Auto]` QA ticket** exists, linked to QA-2730, whose **description lists the real steps the Selenium test performs** (not a copy of the manual script); those steps run green; and a **Pass execution is recorded against the `[Auto]` ticket**. The manual case now has a living automated counterpart that self-reports — without altering the original.

> Discussion: the `[Auto]` ticket documents the automation as it actually behaves, so it never drifts from the code. The manual case (QA-2730) stays untouched as the source of truth; the link keeps them connected, so a red run in CI walks straight back to QA-2730.

### 2.7 — Generate the CI/CD pipeline (10 min)

```
Using the microsoft-docs MCP, look up the Azure DevOps tasks for running
dotnet test with headless Selenium and publishing TRX results. Then create
azure-pipelines.yml that:
- triggers on main and any feature/* branch
- restores and builds the test solution
- starts the HorseWorld backend and frontend (or documents how the agent
  provides them) before the UI stage
- runs HorseWorld.ApiTests and HorseWorld.UITests as separate steps so
  each publishes its own TRX
- fails the pipeline if any step fails
```

**Acceptance:** YAML with separate API and UI test steps, each publishing results, and an app-startup step before the UI run.

---

## ☕ Break — 15 minutes

---

## Part 3 — Build your team toolkit (35 min)

### 3.1 — Get a Skill: draft your own, then install one (15 min)

**Draft from what you just did.** You built two page objects and their tests — codify the recipe:

```
You just helped me add a page object + Selenium tests for a HorseWorld
feature. Capture the repeatable recipe as a skill at
.claude/skills/new-page-object.md:
- the order of work (page object with WebDriverWait accessors → tests)
- locator strategy (CSS class / text — this app has no data-testid)
- the explicit-wait pattern and the no-Thread.Sleep rule
- AAA structure and MethodName_Scenario_ExpectedResult naming
Add a description line so it auto-loads when adding coverage for a page.
```

**Test the skill:**
```
How should I add Selenium coverage for the Breed Encyclopedia detail overlay?
```

Claude should invoke the skill and give step-by-step guidance without you re-explaining the conventions.

**Install a published skill** (`/plugin marketplace add anthropics/skills`) — a natural pick is the `pdf` skill to turn a test-run summary into a shareable report.

### 3.2 — Author a slash command (10 min)

Create `.claude/commands/review-tests.md`:

```markdown
Review the current git diff against our QA team standards:
- Every test follows Arrange/Act/Assert
- Test names match MethodName_Scenario_ExpectedResult
- No Thread.Sleep anywhere — waits use WebDriverWait + ExpectedConditions
- No locators inline in tests — they live in page objects
- Locators are resilient (no brittle absolute XPath; class/text only)
- Assertions check real outcomes, not just "element exists"
- Tests that depend on the random quiz assert on score, not a fixed answer
- No commented-out or skipped tests left behind
Report issues as a checklist. Do not modify any files.
```

**Acceptance:** `/review-tests` checks Selenium-specific standards on demand.

### 3.3 — Add a verification hook (10 min)

**1. Add a deny rule** — deny `git push`.

**2. Add the auto-test hook.** Extend `.claude/settings.json` to run `dotnet test` when a test or page-object file is saved:

```json
{
  "matcher": "Edit(tests/.*\\.(cs))",
  "hooks": [
    {
      "type": "command",
      "command": "dotnet test tests/HorseWorld.UITests --no-restore --nologo 2>&1 | tail -15 || true"
    }
  ]
}
```

(Simpler fallback: run the whole solution's `dotnet test` on any `.cs` edit.)

**3. Test it:** make a small edit; watch the hook run `dotnet test`. Then confirm `git push` is blocked.

**Optional — PreToolUse: block `Thread.Sleep` before it's written.** The number-one Selenium flakiness source:

```js
// .claude/hooks/block-thread-sleep.mjs
const input = JSON.parse(await new Response(process.stdin).text());
const content = input.tool_input?.content ?? input.tool_input?.new_string ?? "";
if (/Thread\.Sleep\s*\(/.test(content)) {
  console.error("Blocked: Thread.Sleep is banned — use WebDriverWait + ExpectedConditions.");
  process.exit(2);
}
process.exit(0);
```

Test it: ask Claude to add a `Thread.Sleep` to a test. The hook intercepts and Claude self-corrects to an explicit wait.

---

## Part 4 — Orchestrate sub-agents to ship a feature (25 min)

**Goal:** deliver complete coverage for the **Breed Encyclopedia** (browse + detail overlay + identification quiz) using a team of sub-agents — sequential, then parallel.

Create three agents under `.claude/agents/`:

`.claude/agents/page-object-author.md`
```markdown
---
name: page-object-author
description: Builds HorseWorld page objects with WebDriverWait accessors. No test code.
tools: Read, Edit, Write
---
You build Page Object Model classes for HorseWorld following CLAUDE.md.
Locators are CSS-class/text (the app has no data-testid), centralised here.
Every accessor uses WebDriverWait. No assertions, no tests — that's test-writer's job.
```

`.claude/agents/test-writer.md`
```markdown
---
name: test-writer
description: Writes and runs NUnit + Selenium tests against HorseWorld page objects. Use after the page object exists.
tools: Bash, Read, Edit, Write
model: claude-haiku-4-5
---
You write NUnit Selenium tests using existing page objects and our CLAUDE.md
conventions (AAA, naming, explicit waits, no Thread.Sleep). Run dotnet test
after writing and fix failures. Report what passed, failed, and what you fixed.
```

`.claude/agents/qa-reviewer.md`
```markdown
---
name: qa-reviewer
description: Read-only. Reviews page objects and tests against QA standards. Never edits.
tools: Read, Bash
---
Review the diff against qa-standards.md and CLAUDE.md. Output a checklist:
brittle locators, missing waits, flakiness risks, weak assertions, Thread.Sleep.
Do not modify files.
```

Orchestrate:

```
/plan

Add full Selenium coverage for the Breed Encyclopedia:
- browse: 12 cards render; clicking a card opens the detail overlay with
  the right breed name; Close dismisses it
- identification quiz: a question loads with 4 options; answering shows
  feedback and increments the score; Next loads a new question
  (assert on score, not a fixed answer — the question is random)

Plan first, then:
- use page-object-author for EncyclopediaPage (cards, overlay, quiz)
- use test-writer to write and run the tests
- use qa-reviewer to check the final diff
List the plan before touching anything.
```

**Acceptance:** coverage ships, all tests pass, reviewer returns an actionable checklist.

**Parallel review fan-out:**

```
Review the Encyclopedia coverage with three qa-reviewer agents in parallel,
each on one concern:
(1) locator resilience (no brittle XPath, survives class changes)
(2) wait correctness (every async state has an explicit wait, no Thread.Sleep)
(3) assertion strength and the random-quiz handling
Run them concurrently, then merge into one prioritised checklist.
```

> Final commit checkpoint. Run `/cost` for total spend. Run `git log --oneline` — clean milestone history.

---

## Part 5 — Bonus: Playwright, and why it clicks with Claude (20 min)

You've just felt Selenium's friction first-hand: no `data-testid`, brittle class locators, `Thread.Sleep`, hand-rolled `WebDriverWait`, a `DriverFactory` to babysit. This part shows the same job in **Playwright for .NET** — and, more importantly, **why Claude is so much more effective with it**.

### Why Playwright pairs so well with Claude

| Selenium pain (what you just lived) | Playwright answer | Why it matters *to Claude specifically* |
|---|---|---|
| Manual `WebDriverWait` on every async state; `Thread.Sleep` creeps in | **Auto-waiting** built into every action and assertion | Claude doesn't have to *reason about timing* — fewer chances to generate a flaky test. The framework removes the failure mode. |
| Class/text locators that match the wrong node | **Semantic locators** — `GetByRole`, `GetByText`, `GetByLabel` | These map to how Claude already "sees" a page (accessibility roles), so it picks resilient locators on the first try. |
| Hard to know what the live DOM actually is | **Playwright MCP** drives a real browser via the accessibility tree | Claude can *explore the running app itself*, then write tests grounded in the real DOM — not guesses. This is the big one. |
| Writing boilerplate by hand | **`codegen`** records clicks into code; **trace viewer** shows exactly what happened | Claude turns a recorded trace or an exploration into a clean test and self-corrects from the trace. |

The headline: **with the Playwright MCP, Claude stops guessing and starts looking.** It opens HorseWorld, reads the real accessibility tree, performs the journey, and writes a test it has already watched pass.

### 5.1 — Connect the Playwright MCP (5 min)

```bash
claude mcp add playwright npx '@playwright/mcp@latest'
```

Confirm with `/mcp` → **playwright — connected**. Then let Claude *drive the real app*:

```
Using the Playwright MCP, open http://localhost:3737, go to the Name
Generator, pick the "mythical" style and "female" gender, click Generate,
and tell me exactly what locators (roles/text) you used and what rendered.
Don't write any test yet — just explore and report.
```

**Acceptance:** Claude navigates the live app and reports real, role-based locators — no `data-testid` required, no guessing from source.

### 5.2 — Generate a Playwright test from what it saw (10 min)

```
Create a tests/HorseWorld.PlaywrightTests project (Microsoft.Playwright.NUnit).
Based on what you just did in the browser, write a test that generates
mythical/female names and asserts exactly 5 name cards render. Use
GetByRole/GetByText locators and Playwright's web-first assertions
(Expect(...).ToHaveCountAsync) — no explicit waits, no Thread.Sleep.
Then run it.
```

> Side-by-side moment: open this test next to your Selenium `NameGeneratorTests.cs`. Same scenario — note the absence of `WebDriverWait`, `DriverFactory`, and class-string locators.

### 5.3 — The honest comparison (5 min)

Discuss as a group — there's no single winner:

- **Selenium** is the incumbent: huge ecosystem, Selenium Grid, the language-agnostic W3C standard, and what most existing .NET QA suites already use. Knowing it is non-negotiable.
- **Playwright** removes the two things that made *today* hard — waiting and locators — and its MCP makes Claude a far stronger pair, because Claude can observe before it writes.
- **The transferable lesson:** the Claude Code workflow you practised — plan mode, CLAUDE.md, hooks, sub-agents, the agentic loop — is **identical** regardless of framework. The tool changes; the way you direct Claude doesn't.

> Optional: ask Claude to add a `BROWSER`-parameterised Playwright run across Chromium, Firefox, and WebKit — one API, three engines, no extra drivers. Contrast with the Selenium cross-browser extra in the optional section.

---

## Wrap-up (5 min)

The loop is identical whether it took 30 seconds or 3 hours — you don't close it until it's green, and you stay in charge. For QA engineers the specific added weight: **a Selenium test that passes for the wrong reason — a locator that matched the wrong node, a `Thread.Sleep` that "usually works" — is worse than no test.** The skill isn't making Claude write tests; it's making Claude write tests that actually catch regressions and stay green for the right reasons.

---

## Optional extras

**Run a headless CI gate:**
```bash
claude -p "Run the full test solution and summarise failures by project." \
  --allowedTools Bash,Read --max-turns 5
echo "exit code: $?"
```

**Cross-browser run.** Extend `DriverFactory` to take a browser from an env var and have Claude run the UI suite against Chrome and Edge:
```
/plan
Parameterise DriverFactory on a BROWSER env var (chrome|edge), both headless
via Selenium Manager. Add an NUnit fixture parameter so the UI suite can run
against either. Plan the change, then run both and report results.
```

**Close the loop against the live app over HTTP** (no Selenium scaffolding — raw API assertions):
```
With the backend running on 7070, exercise it with curl:
- GET /api/breeds and confirm 12 entries
- GET /api/breeds/arabian and confirm the fields
- GET /api/breeds/not-a-breed and confirm 404
- POST /api/personality/result with an empty body and confirm 400
Show the actual requests and JSON responses.
```

**Add a `/coverage-gaps` command** that lists every API endpoint and frontend feature, compares them to existing tests, and outputs a gap table.

**Action PR review comments** via GitHub MCP (read comments → map to fixes → commit per comment → reply to thread).

**Add a `Stop` hook** so QA engineers review the diff before committing:
```json
"Stop": [
  { "hooks": [ { "type": "command", "command": "echo \"✅ Claude finished — check dotnet test and review the diff.\"" } ] }
]
```

**Bundle the toolkit as a plugin** and have a partner install it on a fresh clone — the onboarding test: *"Orient me in this test suite and tell me which HorseWorld features still have no Selenium coverage."*

---

## Key facts for the facilitator

- **The app is read-only.** It lives in `claudeworkshop-day_5_demo_auto_app` and must be **running** (backend 7070, frontend 3737) before the UI exercises. Use a `deny` rule so Claude can read it for context but never patch it.
- **This repo starts empty** — the suite is greenfield. There are no pre-planted broken tests; the honesty comes from the app's **real** quirks: no `data-testid` anywhere, the silent `200` fallback on bad name-generator input, the random quiz, and pervasive async states.
- **Part 2 is two loops:** build real page objects + tests, then de-flake a `Thread.Sleep`/random-answer test. The de-flaking is the signature QA lesson.
- **Part 2.3–2.4** add an API-test layer and a test that *documents a candidate bug* rather than hiding it.
- **Part 2.6 (Zephyr, QA-2730)** needs prep: a `zephyr` skill at `.claude/skills/zephyr/` with a working Zephyr API token in `.claude/skills/zephyr/.env` (git-ignored), and the Atlassian Rovo MCP connected (1.2). Confirm **QA-2730 still maps to a HorseWorld feature** before the session — if it's been retired, swap in a current case key. No Zephyr access? Participants can skip the step-3 execution push and still automate the steps from the issue description.
- **The Skill (3.1)** codifies a page-object recipe; **the command (3.2)** enforces Selenium standards; **the optional PreToolUse hook (3.3)** bans `Thread.Sleep` outright.
- **Part 4's feature** is the Encyclopedia (overlay + random quiz) — enough surface for three coordinated sub-agents.
- **Selenium .NET specifics:** NUnit + `Selenium.WebDriver` + `Selenium.Support`, driver via Selenium Manager (no manual chromedriver), headless by default, base URL from an env var. Cross-browser lives in the optional extras to keep the main lab environment-light.
