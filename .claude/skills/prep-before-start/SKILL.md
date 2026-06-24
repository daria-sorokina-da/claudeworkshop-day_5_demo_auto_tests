---
name: prep-before-start
description: Sync CLAUDE.md with the current state of the HorseWorld app. Checks the app codebase at ../claudeworkshop-day_5_demo_auto_app for any changes (routes, locators, new features, API changes) and updates CLAUDE.md in this repo to reflect what's actually there. Run this at the start of a session before writing or extending tests. Triggers: "prep-before-start", "/prep-before-start", "sync CLAUDE.md", "update CLAUDE.md from the app".
---

# prep-before-start

Syncs `CLAUDE.md` in this test repo with the current state of the HorseWorld app source at `../claudeworkshop-day_5_demo_auto_app`.

## What to do

1. **Check the app's git log** for recent commits:
   ```bash
   cd "C:/Cowork/AI Workshop for AN/claudeworkshop-day_5_demo_auto_app" && git log --oneline -10
   ```

2. **Check for uncommitted local changes** in the app:
   ```bash
   cd "C:/Cowork/AI Workshop for AN/claudeworkshop-day_5_demo_auto_app" && git status && git diff
   ```

3. **Read the key frontend source files** to get the current state (routes, locators, loading states, data-testid attributes):
   - `frontend/src/App.tsx` — routes and nav testids
   - `frontend/src/pages/NameGenerator.tsx` — pills, generate button, name cards
   - `frontend/src/pages/Encyclopedia.tsx` — breed grid, detail overlay, quiz tab, identification quiz locators
   - `frontend/src/pages/PersonalityQuiz.tsx` — question flow, progress, result, retake

4. **Read the current `CLAUDE.md`** in this test repo to see what it already documents.

5. **Update `CLAUDE.md`** to reflect anything that has changed or is missing:
   - Page routes (under "Features Under Test")
   - Locators: `data-testid`, `aria-*`, CSS classes for each feature
   - Loading states, button text changes, async behavior
   - New features or removed features
   - The URL hardcoded in `NameGeneratorPage.cs` (line 8) if the `/name-generator` route changed

6. **Report** a brief summary of what changed and what was updated.

## Scope

Only update `CLAUDE.md`. Do not change test code or page objects unless separately asked. If the page object URLs are now stale (e.g. `NameGeneratorPage` hardcodes `/names` but the app now uses `/name-generator`), flag it as a follow-up rather than fixing it automatically.

## App location

`C:\Cowork\AI Workshop for AN\claudeworkshop-day_5_demo_auto_app`

- Frontend: `frontend/src/`
- Backend: `src/HorseApp.Api/`
