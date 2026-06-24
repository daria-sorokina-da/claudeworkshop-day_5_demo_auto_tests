# tests/CLAUDE.md

Selenium .NET UI test suite for the HorseWorld demo app.

## Commands (run from this directory)

```bash
dotnet build
dotnet test
dotnet test tests/HorseWorld.Tests
dotnet test --filter "FullyQualifiedName~NameGeneratorTests.GenerateNames_ElegantFemale_Returns5Cards"
```

## Project Structure

```
HorseWorld.Tests/
  Base/BaseTest.cs          # Driver setup/teardown; all fixtures inherit this
  Pages/                    # Page Object Model — all locators live here
  Tests/                    # Test fixtures — no locators, only page object calls
HorseWorld.Tests.slnx       # Solution file
```

## Key Patterns

- **Page Object Model** — locators belong in `Pages/`, never in `Tests/`.
- **Explicit waits only** — use `WebDriverWait` + `ExpectedConditions`. No `Thread.Sleep` except inside `Pause()` for debug delays.
- **BaseTest** — `Wait` property creates a new `WebDriverWait` on every call; page objects should hold their own `_wait` field.
- **Locator priority** — `data-testid` > `aria-*` attributes > CSS class > visible text.
- **Headless** — `--headless` is commented out in `BaseTest.cs`; uncomment for CI.

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `HORSEWORLD_URL` | `http://localhost:3737` | Frontend base URL (not yet wired into page objects) |
| `TEST_STEP_DELAY_MS` | `0` | Slow down each action for visual debugging |

**App must be running before tests execute:**
- Frontend: `http://localhost:3737` (Vite + React)
- Backend API: `http://localhost:7070` (ASP.NET Core)

## Adding a New Page Object

1. Create `Pages/<FeatureName>Page.cs` — constructor takes `IWebDriver driver, int stepDelayMs = 0`.
2. Hardcode the feature URL as a `private const string Url`.
3. Expose action methods (navigate, click, fill) and query methods (return values for assertions) — no assertions inside page objects.
4. Create `Tests/<FeatureName>Tests.cs` inheriting `BaseTest`; instantiate the page with `Driver, StepDelayMs`.
