# Depreciation Simulation

An interactive mini-case for graduate students in a beginning accounting course at NYU Stern. The simulation helps students see how depreciation choices affect reported business performance, especially when managers have incentives to improve short-term earnings.

## Background

Depreciation is not just a mechanical accounting calculation. It depends on management estimates and choices, including depreciation method, useful life, and residual value. Those choices can change the timing of depreciation expense, the book value of assets, and reported net income.

This prototype frames the issue as a CEO decision. The CFO asks the player to approve accounting assumptions for a new piece of equipment. The current scenario puts pressure on the CEO to maximize short-term net income because the board is focused on performance in the next one to two years.

## Learning Objectives

Students should be able to:

- Explain depreciation as the allocation of an asset's cost over time.
- Compare straight-line and accelerated depreciation methods.
- Describe how useful life and residual value estimates affect annual depreciation expense.
- Interpret how depreciation choices change book value and net income over a five-year period.
- Recognize how accounting estimates can create opportunities for earnings management.
- Discuss the tradeoff between short-term reported performance and longer-term business health.

## Application structure

The simulation frontend remains a static site that can be hosted on GitHub Pages. The optional outcome service in `server/` runs on Railway with PostgreSQL and verifies NYU Google Identity Services ID tokens.

Current interaction flow:

1. A landing screen introduces the CEO role, the board pressure, and the CFO approval process.
2. The CFO chat walks the player through one decision at a time.
3. The player first chooses a depreciation method, then useful life, then residual value.
4. After the three decisions are introduced, the player can review all assumptions together.
5. The CFO summarizes the selected policy and flags unusually aggressive assumptions, such as a long useful life or high residual value.
6. The results show how the approved policy affects net income, depreciation expense, and book value over the relevant time horizon.

## Project Files

- `index.html` contains the application markup.
- `styles.css` contains the visual design and layout.
- `app.js` contains the simulation logic and interaction state.
- `config.js` identifies the outcome API used by the static frontend.
- `server/` contains the Railway API, database schema initialization, and server-side outcome validation.

## Ending statistics

Signed-in students receive two additions on the final screen:

- The percentage of distinct players who have unlocked the same ending, once the configured minimum sample size has been reached.
- A five-slot ending collection that names unlocked endings while keeping undiscovered endings hidden.

Percentages use distinct authenticated players rather than total playthroughs. Replaying the same ending therefore does not distort the result. Statistics are separated by `OUTCOME_RULESET_VERSION`, so the data does not require a term-by-term reset. Increment that version only when the outcome rules change enough that old and new results should not be compared.

The database stores the stable Google account subject identifier and the submitted accounting policy. It does not store the student's name, email address, or Google access tokens.

## Railway API

The Railway application service should use `/server` as its root directory and `npm start` as its start command. It needs these variables:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
ALLOWED_EMAIL_DOMAINS=nyu.edu
ALLOWED_ORIGINS=https://sternlsl.github.io,http://localhost:4000
OUTCOME_RULESET_VERSION=1
MIN_STATS_PLAYERS=10
NODE_ENV=production
```

The Google client secret is not used. The browser sends a Google ID token, and the API verifies its signature, audience, expiration, verified-email status, and hosted domain.

After the API deploys:

1. Generate a public Railway domain for the application service.
2. Set its health-check path to `/api/health`.
3. Replace the local URL in `config.js` with the generated `https://…up.railway.app` domain.
4. Confirm the Google OAuth web client allows `https://sternlsl.github.io` and `http://localhost:4000` as authorized JavaScript origins.

For local frontend development, serve the repository instead of opening `index.html` directly:

```bash
python3 -m http.server 4000
```

The server requires Node 20 or newer. From `server/`, run:

```bash
pnpm install
pnpm test
pnpm start
```

## Collaboration Notes

Areas for future design and faculty review:

- Add a second scenario focused on long-term company health.
- Add debrief prompts that ask students to explain which choices improved short-term net income and why.
- Clarify how aggressive assumptions may look favorable in early years but shift expense into later years.
- Consider whether to include renovation or reinvestment decisions, including capitalization versus expensing.
- Decide whether the final screen should compare the player's choices to a CFO baseline or to an optimal short-term strategy.

## Publishing

Because this is a static app, it can be published with GitHub Pages. A typical setup would be:

1. Create or choose a repository in the NYU GitHub organization or account.
2. Commit the source files from this folder.
3. Push to the repository.
4. Enable GitHub Pages for the repository branch that contains `index.html`.

No frontend build command is required. Railway installs and starts the backend separately from the `/server` root directory.
