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

| Feature | Status |
|---|---|
| Name Generator | Partial |
| Breed Encyclopedia | None |
| Identification Quiz | None |
| Personality Quiz | None |

**Name Generator** — covered scenarios: generate with style + gender returns 5 cards, copy button shows confirmed state, re-generate returns 5 cards. Not covered: other style/gender combinations, silent fallback, default page state, in-flight disabled state, copy button timeout revert.
