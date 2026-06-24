# Hands-On Claude Code Exercise for QA Teams — Manual + Selenium .NET

**Track:** QA Engineers (manual + automation) · **Duration:** ~5.5 hours + optional extras · **Style:** Individual or pairs

> **What you'll do:** Part 1 is **no-code** — plan, author, review, and even *run* manual tests through Jira, Zephyr, and a real browser. Parts 2–6 then build a **Selenium WebDriver suite in C#/.NET** (plus an API layer and a Playwright bonus) against the **HorseWorld** web app — with Claude Code doing the heavy lifting while you stay in charge.

---

## Contents

- [The system under test — HorseWorld](#the-system-under-test--horseworld)
  - [Concept mapping](#concept-mapping--same-claude-code-skills-qa-context)
- [Part 0 — Setup & ground rules](#part-0--setup--ground-rules-10-min)
- [Part 1 — QA without code: plan, author, review, explore](#part-1--qa-without-code-plan-author-review-explore-60-min)
  - [1.1 — Connect the shared QA toolkit: Jira, Zephyr, Playwright](#11--connect-the-shared-qa-toolkit-jira-zephyr-playwright-15-min)
  - [1.2 — Create a test plan from a story](#12--create-a-test-plan-from-a-story-10-min)
  - [1.3 — Author test cases as Markdown, then push to Jira/Zephyr](#13--author-test-cases-as-markdown-then-push-to-jirazephyr-15-min)
  - [1.4 — Review the test cases](#14--review-the-test-cases-10-min)
  - [1.5 — Run a manual test ad-hoc with Playwright](#15--run-a-manual-test-ad-hoc-with-playwright--straight-from-jira-10-min)
- [Part 2 — Onboard and harness the repo](#part-2--onboard-and-harness-the-repo-55-min)
  - [2.1 — Get oriented, then diagram a journey](#21--get-oriented-then-diagram-a-journey-10-min)
  - [2.2 — Critique the testability of the app](#22--critique-the-testability-of-the-app--no-code-yet-10-min)
  - [2.3 — Plan mode: look before you leap](#23--plan-mode-look-before-you-leap-10-min)
  - [2.4 — Make context permanent in CLAUDE.md](#24--make-context-permanent-in-claudemd-15-min)
  - [2.5 — Permissions are a hard rule](#25--permissions-are-a-hard-rule-not-advice-5-min)
  - [2.6 — Wire up two MCP servers](#26--wire-up-two-mcp-servers--and-pick-the-right-doc-source-5-min)
- [Part 3 — Ship a test suite, then fix a flaky test](#part-3--ship-a-test-suite-then-fix-a-flaky-test-105-min)
  - [3.1 — Plan the first feature's coverage](#31--plan-the-first-features-coverage-10-min)
  - [3.2 — Build it](#32--build-it-20-min)
  - [3.3 — API assertion layer](#33--api-assertion-layer-10-min)
  - [3.4 — Document the silent-fallback behaviour](#34--document-the-silent-fallback-behaviour-15-min)
  - [3.5 — The debugging loop on a flaky test](#35--the-debugging-loop-on-a-flaky-test-10-min)
  - [3.6 — The "app changed, my tests broke" loop](#36--the-app-changed-my-tests-broke-loop-15-min)
  - [3.7 — Automate a Zephyr test case (QA-2730)](#37--automate-an-existing-manual-test-case-from-zephyr--qa-2730-15-min)
  - [3.8 — A readable HTML report](#38--a-readable-html-report-10-min)
  - [3.9 — Generate the CI/CD pipeline](#39--generate-the-cicd-pipeline-10-min)
- [Part 4 — Build your team toolkit](#part-4--build-your-team-toolkit-35-min)
  - [4.1 — Get a Skill](#41--get-a-skill-draft-your-own-then-install-one-15-min)
  - [4.2 — Author a slash command](#42--author-a-slash-command-10-min)
  - [4.3 — Add a verification hook](#43--add-a-verification-hook-10-min)
- [Part 5 — Orchestrate sub-agents to ship a feature](#part-5--orchestrate-sub-agents-to-ship-a-feature-25-min)
- [Part 6 — Bonus: Playwright, and why it clicks with Claude](#part-6--bonus-playwright-and-why-it-clicks-with-claude-30-min)
  - [6.1 — Explore the live app with the Playwright MCP](#61--explore-the-live-app-with-the-playwright-mcp-5-min)
  - [6.2 — Generate a Playwright test from what it saw](#62--generate-a-playwright-test-from-what-it-saw-10-min)
  - [6.3 — Migrate an existing Selenium test to Playwright](#63--migrate-an-existing-selenium-test-to-playwright-10-min)
  - [6.4 — The honest comparison](#64--the-honest-comparison-5-min)
- [Wrap-up](#wrap-up-5-min)
- [Optional extras](#optional-extras)
- [Key facts for the facilitator](#key-facts-for-the-facilitator)

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

### Concept mapping — same Claude Code skills, QA context

| Part | Concepts | QA-specific anchor |
|---|---|---|
| 0 — Setup | Setup check · Git safety net · ground rules | Run HorseWorld; scaffold the .NET test solution |
| 1 — Manual QA (no code) | Atlassian Rovo MCP · Zephyr skill · Playwright MCP (ad-hoc execution) · test-design techniques | Plan from a story, author cases in Markdown → Jira/Zephyr, review them, run a case live in the browser |
| 2 — Onboard & harness | Precise prompting · Plan mode · `/init` · CLAUDE.md · `@import` · Permissions · Context mgmt · Mermaid diagram | Map the app's UI + API surface; diagram a user journey |
| 3 — Ship & debug | Agentic loop · Page Object Model · failure artifacts · Zephyr skill · Hooks · `/rewind` · Red→green debugging · HTML reporting · Git & PR | Write Selenium tests, fix a flaky test, repair a suite after the app changes, automate a Zephyr case (QA-2730), produce a readable report, generate a CI pipeline |
| 4 — Team toolkit | Skills · Slash commands · Hooks (Post + PreToolUse) | Skill for new page-object recipes, command for test review, hook for auto-run |
| 5 — Sub-agents | Sequential + parallel agents · Model selection & cost | Page-object author · test-writer · QA reviewer |
| 6 — Bonus | Playwright MCP · live-browser exploration · framework comparison | Why Claude is stronger with Playwright; same test, no waits/locators pain |
| Optional | GitHub MCP · Azure DevOps pipeline · Headless mode · Plugins · parallel runs | Full CI gate, cross-browser grid, parallel suite |

---

## Part 0 — Setup & ground rules (10 min)

**Get the app running first** (two terminals, in the `..._auto_app` repo):

```bash
# terminal 1 — backend
dotnet run --project src/HorseApp.Api --urls "http://localhost:7070"

# terminal 2 — frontend
cd frontend && npm install && npm run dev      # serves http://localhost:3737
```

Open **http://localhost:3737** and click through all three features once by hand. That manual pass is your ground truth — you can't test what you haven't seen.

**In the test repo**, create a feature branch (`qa-auto-workshop`) and confirm the toolchain:

```bash
dotnet --version          # .NET 8 SDK (needed from Part 2 on)
claude --version
```

**Three rules:**
- Never paste credentials, tokens, or real environment URLs into a prompt.
- Never `--dangerously-skip-permissions`.
- Always read the diff (and any generated test case) before accepting. A test that passes for the wrong reason is worse than no test at all.

**Commands to lean on:** `/help`, `/plan`, `/rewind`, `/clear`, `/compact`, `/context`, `/usage`, `/init`, `/memory`, `Esc`, `Shift+Tab`, `/btw`.

---

## Part 1 — QA without code: plan, author, review, explore (60 min)

**No programming in this part.** It's built for **manual QAs** — and it's a strong warm-up for automation engineers too. Using Claude with your existing **Jira**, **Zephyr**, and a real **browser** (via the Playwright MCP), you'll plan, write, review, and even *execute* tests entirely in natural language. Everyone connects the shared tools here; the automation parts (2–6) reuse them.

### 1.1 — Connect the shared QA toolkit: Jira, Zephyr, Playwright (15 min)

Three connectors power the whole workshop. Set them up once, here.

**Atlassian Rovo MCP — Jira & Confluence:**

```bash
# Official Atlassian Remote MCP server (SSE transport)
claude mcp add --transport sse atlassian https://mcp.atlassian.com/v1/sse
```

Then authenticate:

```
/mcp
```

- Select **atlassian** → **Authenticate**. A browser opens — log in and **Allow**; Claude Code stores the OAuth token.
- If your org has several sites, pick the one hosting your **QA** project.
- `/mcp` should show **atlassian — connected**.

**Zephyr skill — test management** (facilitator-provided at `.claude/skills/zephyr/`). Copy `.claude/skills/zephyr/.env.example` to `.claude/skills/zephyr/.env` — it's git-ignored, **never commit it** — and fill it in:

```bash
# Our QA project uses Zephyr SQUAD — that block is active below.

# --- Zephyr Squad Cloud (active — this is what the QA project uses) ---
# Generate keys in Jira: Apps → Zephyr Squad → "Zephyr Squad API keys".
ZEPHYR_PRODUCT=squad
ZEPHYR_BASE_URL=https://prod-api.zephyr4jiracloud.com/connect
ZEPHYR_ACCESS_KEY=
ZEPHYR_SECRET_KEY=
ZEPHYR_ACCOUNT_ID=         # your Atlassian account id (Profile → account settings)

# --- Zephyr Scale (TM4J) Cloud (only if a project uses Scale instead) ---
# Get the token in Jira: Apps → Zephyr Scale → top-right ⚙ → "API access tokens" → Create.
# ZEPHYR_PRODUCT=scale
# ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2
# ZEPHYR_API_TOKEN=        # a single bearer token

# Jira context — used to resolve the issue/project the case belongs to.
JIRA_BASE_URL=https://anthonynolan.atlassian.net
JIRA_PROJECT_KEY=QA
```

> The **QA** project is wired to **Zephyr Squad** (its test cases are Jira "Test" issues, e.g. QA-2730), so the `squad` block above is the right one. The commented `scale` block is there only if you point the skill at a different project that uses Zephyr Scale.

**Playwright MCP — drive a real browser, no code:**

```bash
claude mcp add playwright npx '@playwright/mcp@latest'
```

`/mcp` should show **playwright — connected**.

> Facilitator note: participants need a Jira account on the QA site and a Zephyr token. No access? You can still do 1.2 and 1.4 (plan + review as Markdown) and the Playwright exploration in 1.5 — just skip the Jira/Zephyr push and execution-logging steps.

### 1.2 — Create a test plan from a story (10 min)

Point Claude at a real requirement and let it draft the plan. The story is **[NOVA-13297](https://anthonynolan.atlassian.net/browse/NOVA-13297)** — *HorseWorld: Name Generator*. Without Jira access, use the feature description from the app's README instead.

```
Read NOVA-13297 via the Atlassian Rovo MCP (or, if I have no Jira access,
the Name Generator section of the HorseWorld README). Draft a test plan and
save it to .temp/test-plan-name-generator.md:
- scope, and what's explicitly out of scope
- the main risks to test around (invalid input, async states, edge cases)
- a list of test scenarios grouped by positive / negative / boundary,
  using equivalence partitioning and boundary-value analysis
Don't write full step-by-step cases yet — just the plan.
```

> `.temp/` is scratch space and must not be committed. Git-ignore it now: *"Add `.temp/` to `.gitignore`, creating the file if it doesn't exist."*

**Acceptance:** a reviewable test plan in `.temp/` that names real risks (the silent name-generator fallback, the "Generating…" async gap) and organises scenarios by technique — not a vague list.

### 1.3 — Author test cases as Markdown, then push to Jira/Zephyr (15 min)

Draft first **as Markdown**, where it's cheap to read, edit, and diff — then publish to the test-management system once you're happy.

```
From .temp/test-plan-name-generator.md, write full manual test cases to
.temp/test-cases-name-generator.md. For each case: an ID/slug, a title in
Feature_Scenario_ExpectedResult form, preconditions, numbered steps with
test data, and the expected result per step. Cover the positive, negative,
and boundary scenarios from the plan.
```

Review and tweak the Markdown directly. When it's right, publish:

```
Now create these as test cases in our QA project: use the zephyr skill to
create each as a Zephyr test case with its steps, and (via the Atlassian
Rovo MCP) link them to NOVA-13297. Show me the created case keys
and write each key next to its case in the Markdown file.
```

**Acceptance:** polished cases live in `.temp/` as Markdown **and** as Zephyr test cases linked to the story, with keys written back into the Markdown. The Markdown is the working draft; Zephyr is the system of record.

> Why Markdown first? You can read a whole suite at a glance, edit in seconds, and keep it under version control — far faster than clicking through Zephyr's editor for every revision.

### 1.4 — Review the test cases (10 min)

Before they're trusted, have Claude critique them — the same review discipline the automation track applies to code.

```
Review .temp/test-cases-name-generator.md for quality:
- coverage gaps vs. the test plan (any scenario or feature path missed?)
- ambiguous or unverifiable expected results
- missing negative / boundary cases (empty input, unknown style, very long
  values, the silent-fallback behaviour)
- duplicate or overlapping cases
Output a prioritised checklist. Don't rewrite the cases — just review.
```

> Optional: save this as a reusable command at `.claude/commands/review-testcases.md` so any manual QA can run `/review-testcases` on a draft.

**Acceptance:** a concrete checklist of gaps and ambiguities a human can act on — the second pair of eyes manual suites rarely get.

### 1.5 — Run a manual test ad-hoc with Playwright — straight from Jira (10 min)

This is the payoff: **execute** a manual test case against the live app **without writing a line of automation**. Claude drives a real browser through the Playwright MCP, follows the steps, checks the expected results, and reports — capturing screenshots as it goes.

```
Take a case you created in 1.3, or QA-2730
(https://anthonynolan.atlassian.net/browse/QA-2730). Fetch its steps
(Atlassian Rovo MCP + zephyr skill), then USE THE PLAYWRIGHT MCP to execute
them against
http://localhost:3737: perform each step, check each expected result, and
take a screenshot at every check. Report a per-step pass/fail table and an
overall verdict. Don't write any test code — just drive the browser.
```

If you have Zephyr access, log the run back:

```
Using the zephyr skill, record this run as a test execution against the case
— Pass/Fail per your verdict — with the timestamp and the screenshots attached.
Show me the execution key.
```

**Acceptance:** Claude drives the real browser through the manual steps, returns a step-by-step verdict with screenshots, and (with Zephyr access) records the execution. A manual test case just ran itself — no automation project required.

> This is where manual and automation meet: in **Part 3.7** you'll take this same kind of case and turn it into a permanent Selenium test. Ad-hoc Playwright execution is the bridge.

---

## Part 2 — Onboard and harness the repo (55 min)

### 2.1 — Get oriented, then diagram a journey (10 min)

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

### 2.2 — Critique the testability of the app — no code yet (10 min)

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

Then raise them as work items with the Atlassian Rovo MCP you connected in 1.1:

```
Using the Atlassian Rovo MCP, create a Jira ticket in project NOVA for each
testability risk in .temp/testability-notes.md. For each: a clear summary,
a description with where it is / why it's risky / the locator-or-wait
strategy to mitigate, and label them `QAAutoTestability`. Show me the ticket
keys, and add each key next to its risk in .temp/testability-notes.md.
```

**Acceptance:** `.temp/testability-notes.md` lists each risk with its Jira key, and the tickets exist in NOVA under the `QAAutoTestability` label. You'll reference both through Part 3.

### 2.3 — Plan mode: look before you leap (10 min)

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

**Acceptance:** the plan covers the **UI-only** structure, the CLAUDE.md notes, and a **feature-by-feature delivery order** (each feature: page object → tests → green before the next); the API-test layer is explicitly deferred (it lands in 3.3); **no project files exist yet**. Participants shape the plan before any scaffolding is written — the plan/thinking separation is the lesson.

### 2.4 — Make context permanent in CLAUDE.md (15 min)

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

### 2.5 — Permissions are a hard rule, not advice (5 min)

Set up `.claude/settings.json` with a `deny` on the app repo so Claude can read it but never modify the system under test. Then try to cross the line:

```
Add a data-testid to ../claudeworkshop-day_5_demo_auto_app/frontend/src/pages/NameGenerator.tsx
```

**Acceptance:** blocked by the `deny` rule. Discussion point: it's tempting to "just add a test id to the app," but in a real engagement the app is owned by another team — your suite has to survive against the UI **as shipped**, not a version you patched.

### 2.6 — Wire up two MCP servers — and pick the right doc source (5 min)

No single docs MCP covers everything, so connect two and learn which answers which question:

- **Microsoft Learn MCP** — serves `learn.microsoft.com`: the right tool for **.NET**, **Azure DevOps** (you'll use it in 3.9), and **Playwright for .NET** (Microsoft-owned, Part 6). It does **not** cover Selenium.
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

## Part 3 — Ship a test suite, then fix a flaky test (105 min)

**Goal:** run the full agentic loop twice — once to *build real page objects + tests*, once to *debug and de-flake a test*. A hook runs `dotnet test` on every test-file edit, so red→green is immediate.

### 3.1 — Plan the first feature's coverage (10 min)

Optional Jira start (Atlassian Rovo MCP) — the story is **[NOVA-13298](https://anthonynolan.atlassian.net/browse/NOVA-13298)** — *Add automated UI coverage for the HorseWorld Name Generator*.

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

### 3.2 — Build it (20 min)

#### 3.2.1 — The Support layer + first page object

```
Create the Support layer:
- DriverFactory: headless Chrome via Selenium Manager, 1280x900 window,
  base URL from HORSEWORLD_URL env var (default http://localhost:3737)
- BaseTest: NUnit [SetUp]/[TearDown] that opens and quits the driver, AND
  on failure (TestContext.Result.Outcome is Failed) captures evidence:
    * a full-page screenshot to TestResults/artifacts/{TestName}.png
    * the page source (driver.PageSource) to {TestName}.html
    * the current URL
  Attach all three to the NUnit result with TestContext.AddTestAttachment
  so they ride along with the test report. Only on failure — keep green
  runs clean.
Then create Pages/NameGeneratorPage.cs with WebDriverWait-based accessors
for the style pills, gender pills, Generate button, and name cards.
No tests yet.
```

**Why this first:** a Selenium failure with no screenshot is a guessing game. Capturing the screen, DOM, and URL on every red — automatically — is the single highest-leverage thing in the suite. Add `TestResults/` to `.gitignore`.

> Commit checkpoint. Then `/clear`.

#### 3.2.2 — The tests

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

#### 3.2.3 — Second feature: the Personality Quiz flow

```
Add Pages/PersonalityQuizPage.cs and Tests/PersonalityQuizTests.cs:
- a page object that answers question N by clicking the first option and
  waits for the next question (progress bar advances) or the result card
- a test that completes all 8 questions and asserts a breed result renders
- a test that the Retake button resets to question 1
Wait on the "Calculating your breed…" state before asserting the result.
```

> Commit checkpoint.

### 3.3 — API assertion layer (10 min)

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

### 3.4 — Document the silent-fallback behaviour (15 min)

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

### 3.5 — The debugging loop on a flaky test (10 min)

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

### 3.6 — The "app changed, my tests broke" loop (15 min)

This is the defining cost of UI automation — the app evolves and the suite goes red — and it's exactly where Claude earns its keep. The facilitator makes a small, realistic change to the **running** HorseWorld frontend (e.g. renames the `.gen-btn` class, relabels the "✨ Generate Names" button, or restructures the name cards). Your green suite is now red.

**1. Triage from the evidence, don't guess:**

```
Several UI tests just went red. Run the suite, then for each failure read
the screenshot and page source we captured in TestResults/artifacts/.
Tell me: which locator broke, what the app changed to, and whether this is
a real regression in HorseWorld or just a brittle locator on our side.
Don't fix anything yet.
```

**2. Fix the suite — not the app:**

```
For each failure that's a locator/label drift (not a real bug), update the
page object so the suite passes against the app as it is now. Locator
changes belong in the page object only — tests must not change. Keep using
WebDriverWait. Run until green.
```

**Acceptance:** Claude uses the captured screenshots/DOM to pinpoint each break, fixes **only the page objects**, and the suite goes green again — with the tests themselves untouched. This is the payoff of 3.2.1's failure artifacts and the page-object discipline.

> Discussion: notice you never opened the app in a browser to debug — the artifacts did the explaining. That's the maintenance loop that makes a UI suite survivable.

> Commit checkpoint.

### 3.7 — Automate an existing manual test case from Zephyr — QA-2730 (15 min)

This is the most realistic QA task of the day: take a **manual test case that already lives in the test-management system** and turn it into automation that reports its own result back. The case is [QA-2730](https://anthonynolan.atlassian.net/browse/QA-2730) in Zephyr — the same kind of case you ran ad-hoc in 1.5, now made permanent.

> You connected the `zephyr` skill and the Atlassian Rovo MCP in 1.1, and filled the skill's `.env` there.

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

### 3.8 — A readable HTML report (10 min)

TRX is for CI plumbing — nobody on the team *reads* it. QA lives and dies by reporting, so add a human-friendly HTML report that anyone (PM, manual tester, lead) can open.

```
Add ExtentReports to the test solution and wire it into our BaseTest so
every run produces TestResults/report/index.html:
- one row per test with pass/fail status and duration
- on failure, embed the screenshot we already capture in 3.2.1 and the URL
- a run summary at the top (total / passed / failed / pass rate)
Don't change any test logic — this is reporting only. Generate the report,
then open it and show me what a failed run looks like.
```

> Prefer Allure? Swap "ExtentReports" for "Allure.NUnit" in the prompt — same intent, attach the failure artifacts to the Allure result. Add `TestResults/report/` to `.gitignore`.

**Acceptance:** a self-contained `index.html` opens in a browser showing per-test results, a summary, and the failure screenshot inline. The report is generated by the run, not hand-made.

### 3.9 — Generate the CI/CD pipeline (10 min)

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
- publishes TestResults/report (the HTML report from 3.8) and
  TestResults/artifacts (failure screenshots) as pipeline artifacts,
  even when tests fail (condition: always())
- fails the pipeline if any step fails
```

**Acceptance:** YAML with separate API and UI test steps, an app-startup step before the UI run, and the HTML report + failure artifacts published on every run (including red ones).

---

## ☕ Break — 15 minutes

---

## Part 4 — Build your team toolkit (35 min)

### 4.1 — Get a Skill: draft your own, then install one (15 min)

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

### 4.2 — Author a slash command (10 min)

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

### 4.3 — Add a verification hook (10 min)

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

## Part 5 — Orchestrate sub-agents to ship a feature (25 min)

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

## Part 6 — Bonus: Playwright, and why it clicks with Claude (30 min)

You've just felt Selenium's friction first-hand: no `data-testid`, brittle class locators, `Thread.Sleep`, hand-rolled `WebDriverWait`, a `DriverFactory` to babysit. This part shows the same job in **Playwright for .NET** — and, more importantly, **why Claude is so much more effective with it**.

### Why Playwright pairs so well with Claude

| Selenium pain (what you just lived) | Playwright answer | Why it matters *to Claude specifically* |
|---|---|---|
| Manual `WebDriverWait` on every async state; `Thread.Sleep` creeps in | **Auto-waiting** built into every action and assertion | Claude doesn't have to *reason about timing* — fewer chances to generate a flaky test. The framework removes the failure mode. |
| Class/text locators that match the wrong node | **Semantic locators** — `GetByRole`, `GetByText`, `GetByLabel` | These map to how Claude already "sees" a page (accessibility roles), so it picks resilient locators on the first try. |
| Hard to know what the live DOM actually is | **Playwright MCP** drives a real browser via the accessibility tree | Claude can *explore the running app itself*, then write tests grounded in the real DOM — not guesses. This is the big one. |
| Writing boilerplate by hand | **`codegen`** records clicks into code; **trace viewer** shows exactly what happened | Claude turns a recorded trace or an exploration into a clean test and self-corrects from the trace. |

The headline: **with the Playwright MCP, Claude stops guessing and starts looking.** It opens HorseWorld, reads the real accessibility tree, performs the journey, and writes a test it has already watched pass — the same capability you used for ad-hoc manual execution back in 1.5.

### 6.1 — Explore the live app with the Playwright MCP (5 min)

You connected the Playwright MCP in 1.1. Now point it at the app and let Claude drive — this time to seed a real test:

```
Using the Playwright MCP, open http://localhost:3737, go to the Name
Generator, pick the "mythical" style and "female" gender, click Generate,
and tell me exactly what locators (roles/text) you used and what rendered.
Don't write any test yet — just explore and report.
```

**Acceptance:** Claude navigates the live app and reports real, role-based locators — no `data-testid` required, no guessing from source.

### 6.2 — Generate a Playwright test from what it saw (10 min)

```
Create a tests/HorseWorld.PlaywrightTests project (Microsoft.Playwright.NUnit).
Based on what you just did in the browser, write a test that generates
mythical/female names and asserts exactly 5 name cards render. Use
GetByRole/GetByText locators and Playwright's web-first assertions
(Expect(...).ToHaveCountAsync) — no explicit waits, no Thread.Sleep.
Then run it.
```

> Side-by-side moment: open this test next to your Selenium `NameGeneratorTests.cs`. Same scenario — note the absence of `WebDriverWait`, `DriverFactory`, and class-string locators.

### 6.3 — Migrate an existing Selenium test to Playwright (10 min)

Greenfield is the easy case. The real question for an established team is: *can Claude carry our existing suite across?* Pick a test you already wrote — the multi-step **Personality Quiz** flow is the best demo, since it's where Selenium's waits and locators hurt most — and migrate it:

```
Rewrite our Selenium test Tests/PersonalityQuizTests.cs as a Playwright test
in tests/HorseWorld.PlaywrightTests, preserving the exact scenario and
assertions. Replace:
- the page-object class locators with GetByRole/GetByText
- every WebDriverWait with Playwright's auto-waiting web-first assertions
- the answer-all-8-questions loop with the equivalent Playwright navigation
Keep the same test name and AAA structure so the two are directly comparable.
Run it, then show me a side-by-side summary of what shrank and what got
clearer — line count, waits removed, locators changed.
```

**Acceptance:** the migrated test passes with identical coverage, no explicit waits, and semantic locators — and Claude reports concretely what the migration removed (the `WebDriverWait` calls, the `DriverFactory` plumbing, the brittle class locators).

> Discussion: this is how you'd actually evaluate a framework switch — migrate one representative test, measure the delta, and let the team judge. Claude makes that experiment cheap.

### 6.4 — The honest comparison (5 min)

Discuss as a group — there's no single winner:

- **Selenium** is the incumbent: huge ecosystem, Selenium Grid, the language-agnostic W3C standard, and what most existing .NET QA suites already use. Knowing it is non-negotiable.
- **Playwright** removes the two things that made *today* hard — waiting and locators — and its MCP makes Claude a far stronger pair, because Claude can observe before it writes.
- **The transferable lesson:** the Claude Code workflow you practised — plan mode, CLAUDE.md, hooks, sub-agents, the agentic loop — is **identical** regardless of framework. The tool changes; the way you direct Claude doesn't.

> Optional: ask Claude to add a `BROWSER`-parameterised Playwright run across Chromium, Firefox, and WebKit — one API, three engines, no extra drivers. Contrast with the Selenium cross-browser extra in the optional section.

---

## Wrap-up (5 min)

The loop is identical whether it took 30 seconds or 3 hours — you don't close it until it's green, and you stay in charge. For QA engineers the specific added weight: **a test that passes for the wrong reason — a locator that matched the wrong node, a `Thread.Sleep` that "usually works," a manual case with an unverifiable expected result — is worse than no test.** The skill isn't making Claude write tests; it's making Claude write tests that actually catch regressions and stay green for the right reasons — whether they're manual cases in Zephyr or Selenium in CI.

---

## Optional extras

**Run the UI suite in parallel.** Suite speed is a top QA concern — and parallelism flushes out hidden test-isolation bugs:
```
/plan
Make the UI suite run in parallel safely. Add [Parallelizable(ParallelScope.Fixtures)]
and set a sensible LevelOfParallelism, then make WebDriver strictly per-test
(no shared static driver) so fixtures don't collide. Plan the change, then run
the whole suite parallel and confirm it's still green and faster. If anything
goes red, it's a real isolation bug — fix it.
```
Discuss what broke: shared state, fixed ports, or order-dependent assumptions are exactly what parallel runs expose.

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

- **The app is read-only.** It lives in `claudeworkshop-day_5_demo_auto_app` and must be **running** (backend 7070, frontend 3737) before the UI exercises *and* before the Playwright execution in 1.5. Use a `deny` rule so Claude can read it for context but never patch it.
- **Pre-seeded Jira tickets** (already created for this workshop):
  - [NOVA-13297](https://anthonynolan.atlassian.net/browse/NOVA-13297) — *HorseWorld: Name Generator* feature story (Part 1.2 plan, Part 1.3 case links).
  - [NOVA-13298](https://anthonynolan.atlassian.net/browse/NOVA-13298) — *Add automated UI coverage for the Name Generator* automation story (Part 3.1).
  - [QA-2730](https://anthonynolan.atlassian.net/browse/QA-2730) — *Generate horse names by style and gender* Zephyr Squad test case in **QA** (Part 1.5 ad-hoc run, Part 3.7 automation). It maps to the Name Generator. Everything else (testability tickets in NOVA, authored cases in QA, the `[Auto]` ticket) is created live by participants.
- **Part 1 is no-code (manual QA).** It needs the Rovo MCP, the Zephyr skill, and the Playwright MCP all connected in 1.1; the NOVA-13297 story for 1.2; and a case key (QA-2730 or one authored in 1.3) for 1.5. Participants without Jira/Zephyr can still do the plan, the review, and the live Playwright execution — they just skip the push/log steps.
- **This repo starts empty** — the automation suite is greenfield. There are no pre-planted broken tests; the honesty comes from the app's **real** quirks: no `data-testid` anywhere, the silent `200` fallback on bad name-generator input, the random quiz, and pervasive async states.
- **Part 3 is two loops:** build real page objects + tests, then de-flake a `Thread.Sleep`/random-answer test. The de-flaking is the signature QA lesson.
- **Part 3.3–3.4** add an API-test layer and a test that *documents a candidate bug* rather than hiding it.
- **Part 3.6 (app-changed loop)** needs prep: have a small, reversible frontend tweak ready (rename a class like `.gen-btn`, relabel a button, or restructure the name cards) to break the suite on cue. Revert it after.
- **Part 3.7 (Zephyr, QA-2730)** reuses the `zephyr` skill and Rovo MCP set up in 1.1. QA-2730 currently maps to the Name Generator (Zephyr Squad test in **QA**); if it's retired before a future run, swap in a current case key. Note QA uses **Zephyr Squad** (Jira "Test" issue type), so the skill's `.env` should use the `squad` block.
- **The Skill (4.1)** codifies a page-object recipe; **the command (4.2)** enforces Selenium standards; **the optional PreToolUse hook (4.3)** bans `Thread.Sleep` outright.
- **Part 5's feature** is the Encyclopedia (overlay + random quiz) — enough surface for three coordinated sub-agents.
- **Selenium .NET specifics:** NUnit + `Selenium.WebDriver` + `Selenium.Support`, driver via Selenium Manager (no manual chromedriver), headless by default, base URL from an env var. Cross-browser and parallel runs live in the optional extras to keep the main lab environment-light.
