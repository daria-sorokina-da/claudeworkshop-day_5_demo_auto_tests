---
name: update-docs
description: Update CLAUDE.md files (root and tests/) and README.md to reflect what has changed on the current branch versus main. Run before creating a PR so that documentation accurately lists covered/not-covered tests, updated page objects, and new project structure. Triggers: "/update-docs", "update docs", "update CLAUDE.md", "sync docs before PR".
---

# update-docs skill

Compare the current branch against `main` and update documentation to match the
actual state of the code. Do **not** re-derive things that are already correct —
only change what the branch actually added or removed.

## Steps

### 1 — Gather branch context

Run these commands and read the output carefully:

```bash
git diff main...HEAD --name-only
git log main...HEAD --oneline
```

Then read every file that appears in the diff and is under:
- `tests/HorseWorld.Tests/Tests/` — test fixture classes
- `tests/HorseWorld.Tests/Pages/` — page object classes

For each such file, note:
- **Test methods** that exist (what scenarios are now covered)
- **Page object methods** exposed (navigation, actions, queries)
- **Feature area** the file belongs to (name-generator, encyclopedia, quiz, etc.)

### 2 — Update root `CLAUDE.md`

Open `CLAUDE.md` and update each feature section that was touched by the branch.

**Coverage tracking rules:**
- If a test method exercises a scenario listed under "**Not covered:**", move that
  bullet to "**Covered:**" and add the Jira ticket key in parentheses if you can
  infer it from test names, comments, or commit messages (e.g. `(QA-2730)`).
- If a test method exercises a NEW scenario not yet listed anywhere, add it under
  "**Covered:**".
- If the branch REMOVES a test, move the bullet back to "**Not covered:**".
- Do NOT change sections for features the branch did not touch.
- Keep bullet wording concise and consistent with the existing style.

**Page object / locator updates:**
- If a page object was added or its locators changed, update the "Page object:"
  line in the relevant feature section (e.g. `Page object: Pages/FooPage.cs`).

### 3 — Update `tests/CLAUDE.md`

Open `tests/CLAUDE.md` and update only what changed:

- If new `.cs` files were added under `Tests/` or `Pages/`, add them to the
  "Project Structure" tree.
- If the "Adding a New Page Object" instructions are still accurate, leave them
  alone.
- Do not rewrite sections that are correct.

### 4 — Update or create `README.md`

Check whether a `README.md` exists at the repo root.

**If it does not exist:** create one with these sections (keep it brief):

```markdown
# HorseWorld Test Suite

Selenium .NET UI tests for the HorseWorld demo app.

## Quick start

Prerequisites: .NET 8, Chrome.  
The HorseWorld app must be running (frontend `:3737`, backend API `:7070`).

```bash
cd tests
dotnet build
dotnet test
```

## Coverage

List feature areas and their current coverage status (Covered / Partial / None),
derived from what is actually in the test suite.
```

**If it already exists:** update only the Coverage table/section to match the
current state of the test suite. Do not reformat or rewrite other sections.

### 5 — Commit the doc changes

Stage and commit **only** the doc files that were actually modified. Do not
stage any other files.

```bash
git add CLAUDE.md tests/CLAUDE.md README.md
git diff --cached --quiet || git commit -m "$(cat <<'EOF'
docs: update CLAUDE.md and README to reflect current branch coverage

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

If `git diff --cached --quiet` exits 0 (nothing staged), skip the commit and
note it in the report.

### 6 — Verify and report

After editing and committing, briefly report to the user:
- Which files were changed
- What bullets moved from "Not covered" to "Covered" (or were added)
- Whether README.md was created or updated
- Whether a commit was created (or skipped because nothing changed)

Do NOT make stylistic changes to content the branch did not touch. Minimal diff
is the goal.
