# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repo Is

A Selenium .NET UI test suite for **HorseWorld** — a small demo web app used in a QA automation workshop. The tests live under `tests/HorseWorld.Tests/` and target a separately running frontend/backend app (not in this repo).

## Test Suite

See [tests/CLAUDE.md](tests/CLAUDE.md) for build/run commands, project structure, key patterns, and guidance on adding new page objects.

## HorseWorld App — Features Under Test

The app uses hardcoded in-memory data (no database).

**Navigation:** The app uses react-router-dom URL routing (not tab-based switching). Nav buttons have `data-testid` attributes — `nav-encyclopedia`, `nav-names`, `nav-quiz` — and Selenium can deep-link directly to each page without clicking nav.

### Name Generator (`/name-generator`)
Style pills (elegant / wild / mythical / celtic / nature) and gender pills (male / female / neutral) — both use `data-testid='style-{value}'` and `data-testid='gender-{value}'`. Selection state is reflected via `aria-pressed="true"`. A Generate button (`.gen-btn`) triggers the call; results appear as `.name-card` elements, each with a copy button (`.copy-btn`) that briefly shows "✓" on click.

- API: `GET /api/names/generate?style=&gender=`, `GET /api/names/options`
- Quirk: invalid style/gender silently falls back to nature/neutral — returns 200, not 400
- Page object: `Pages/NameGeneratorPage.cs` | Tests: `Tests/NameGeneratorTests.cs`

**Covered:** nothing yet — no page object or tests exist.

**Not covered:**
- Generate with valid style + gender → 5 cards returned, button re-enables (`QA-2730`)
- Copy button on first card flips to "✓" confirmed state
- Re-generate with same selections → 5 cards again
- All style/gender combinations (only elegant/female tested)
- Silent fallback behavior when invalid style or gender is passed
- Default state on page load (no style/gender pre-selected)
- Generate button disabled during in-flight request
- Copy button reverts back from "✓" after timeout
- All 5 copy buttons (only first card tested)

### Breed Encyclopedia (`/`)
Grid of 12 breed cards (`.card`); clicking one opens an async detail overlay (`.detail-overlay` / `.detail-panel`, close via `.close-btn`). "Loading breeds…" shown while fetching (`.loading`). A second tab (`.tab-btn`) switches to the **Identification Quiz**.

- API: `GET /api/breeds`, `GET /api/breeds/{id}` (404 if missing)
- Tab buttons use `.tab-btn` CSS class with text "Browse Breeds" / "Identification Quiz" (no `data-testid`)

**Covered:** nothing yet — no page object or tests exist.

**Not covered:**
- 12 breed cards render on load
- Clicking a card opens the detail overlay
- Detail overlay contains expected breed information (name, origin, category, temperament, uses, fun facts)
- Closing the overlay (`.close-btn` or click outside) returns to the grid

### Identification Quiz (tab within `/`)
Displays a mystery breed description with trait clue chips and 4 answer buttons. Instant feedback after selection; running score shown.

- API: `GET /api/breeds/quiz/question`, `POST /api/breeds/quiz/answer`
- Quirk: question is **random** — assert score increment, not a fixed answer
- Locators: `.quiz-card` container; answer buttons `.quiz-opt` (gain `.correct`/`.incorrect` CSS after submission); feedback `.quiz-feedback.ok` / `.quiz-feedback.err`; score `.quiz-score`; next button `.next-btn`

**Covered:** nothing yet — no page object or tests exist.

**Not covered:**
- Quiz tab is reachable from the Breed Encyclopedia page
- 4 answer options are displayed
- Correct answer increments score; wrong answer does not
- Feedback message is shown after answering
- Score persists across multiple questions in the same session

### Personality Quiz (`/quiz`)
8-question flow ("Which breed are you?"); shows a "Calculating your breed…" loading state before revealing the result breed and a Retake button.

- API: `GET /api/personality/questions`, `POST /api/personality/result` (400 if no answers submitted)
- Locators: `.p-quiz` container; progress bar `.progress-bar` > `.progress-fill` (inline `width` style); question text `.p-question`; answer buttons `.p-opt` in `.p-options`; loading `.loading` ("Loading quiz…" / "Calculating your breed…"); result `.result-card`; retake `.retake-btn`

**Covered:** nothing yet — no page object or tests exist.

**Not covered:**
- All 8 questions are presented in sequence
- Selecting an answer advances to the next question
- "Calculating your breed…" loading state appears before result
- Result screen shows a breed name and Retake button
- Retake resets the quiz to question 1

## Integration Points

- **Atlassian Rovo MCP** — read/write Jira issues and Confluence pages
- **Zephyr skill** (`/zephyr`) — read/write Zephyr Squad test steps; credentials in `.claude/skills/zephyr/.env` (git-ignored)
- **Playwright MCP** — ad-hoc browser automation for manual QA exploration

## Important Notes

- `.temp/` is a git-ignored scratch directory for plans and drafts
- Headless Chrome is configured but commented out in `BaseTest.cs` — uncomment for CI
- The full workshop exercise guide is in `EXERCISE.md`
