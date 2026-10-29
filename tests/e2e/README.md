# Playwright e2e (QA fork)

This directory lives only on the `feature/qa/playwright-e2e` branch of the `ironprogrammer/ModernPress` fork. It is not part of `moderntribe/modernpress` and must not reach it until we decide to share it.

## Setup

Clone the fork, not the org repo:

```sh
git clone git@github.com:ironprogrammer/ModernPress.git
cd ModernPress
git remote add upstream git@github.com:moderntribe/modernpress.git
git remote set-url --push upstream DISABLED
gh repo set-default ironprogrammer/ModernPress
git switch feature/qa/playwright-e2e
```

The `DISABLED` push URL makes an accidental `git push upstream` fail locally. `gh repo set-default` keeps `gh pr create` and similar commands pointed at the fork.

## Rules

- Push only to `origin` and only to `feature/qa/*` branches. Never push to `main` on the fork, so it stays a clean mirror of upstream.
- Open PRs only against the fork, and always with an explicit repo: `gh pr create --repo ironprogrammer/ModernPress --base feature/qa/playwright-e2e`.
- In the GitHub web UI, confirm the base repository says `ironprogrammer/ModernPress` before clicking Create pull request. GitHub defaults to the upstream repo for forks.
- Open a PR into `moderntribe/modernpress` only when we both agree it's time.

## Syncing with upstream

```sh
git fetch upstream
git switch main && git merge --ff-only upstream/main && git push origin main
git switch feature/qa/playwright-e2e && git merge main
```

If `--ff-only` fails, `main` has diverged. Stop and tell Brian.

## Running tests

Tests boot a fresh [WordPress Playground](https://wordpress.github.io/wordpress-playground/) site with this repo's plugins, mu-plugins, theme, and `vendor/` mounted, then load pages from `fixtures/`. No Lando or Docker is needed.

One-time setup, from the repo root:

```sh
nvm use
composer create-auth      # needs the 1Password CLI
composer install          # with PHP 8.4
npm ci
npm run build
npx playwright install chromium webkit
```

Then, from the repo root:

| Command | Runs |
|---|---|
| `npm run test:e2e` | Everything |
| `npm run test:e2e:smoke` | Smoke tests only |
| `npm run test:e2e:a11y` | Accessibility tests (WCAG 2.x A/AA plus axe best practices) |
| `npm run test:e2e:wcag` | Accessibility tests, WCAG only |
| `npm run test:e2e:latest` | Everything, on the latest stable WordPress instead of the version in `composer.json` |
| `npm run test:e2e:beta` | Everything, on the current WordPress beta or RC |
| `npm run test:e2e:lint` | Checks every test has one safety tag, and no `.only` or fixed waits. Run before pushing |

Each run prints the WordPress version the site actually runs. Accessibility failures are labeled with their WCAG criteria or as a best practice. Failed tests attach axe's full results as `axe-results`. Results land in `tests/e2e/.results/`, and `npx playwright show-report tests/e2e/.report` opens the HTML report.

## Browsing the test site

To check a failure by hand, boot the same site the tests use:

| Command | WordPress version |
|---|---|
| `npm run test:e2e:server` | Version in `composer.json` |
| `npm run test:e2e:server:latest` | Latest stable |
| `npm run test:e2e:server:beta` | Current beta or RC |

Wait for `Ready!` before loading any page. Links to every page the tests cover print right after it. Paths come from the fixtures in this repo and won't match the demo site. Requests made during boot leave Playground workers serving the default theme until restart. Each site takes port 9400, or a free port if that's taken, so several can run side by side (for example, the pinned version next to beta). Stop one with Ctrl+C. Tests always boot their own fresh site on port 9500, so they can run while these are up.

## Live environments

The same suite runs against Dev, Staging, or Production with `npm run test:e2e:dev`, `test:e2e:staging`, or `test:e2e:production`. Copy `tests/e2e/.env.example` to `tests/e2e/.env` and fill in the URLs, Glomar query, and test accounts first. `.env` is git-ignored; never commit credentials.

Projects split tests by safety tag, so a live run never does more than it should:

- `readonly` and `readonly-mobile` only read. `@fixtures` tests are skipped, because live sites don't have the fixture pages.
- `mutating` tests change site state, including failed-login counters. `content-setup` first checks that the automation account (`QA_AUTOMATION_USER` / `QA_AUTOMATION_APP_PASSWORD`) can create and permanently delete content through the REST API. `content-teardown` deletes everything the run created and fails if anything with the run's `qa-auto-<runId>-` prefix is left.
- `readonly-account` and `mutating-account` run `@requires-account` tests after `auth-setup` logs in once per role in `QA_ROLES`. A role without credentials is skipped, and logins are never retried.
- Production registers only `readonly` and `readonly-mobile`.

Dev is behind the Glomar access gate: `glomar-setup` visits `/?secret=1` (from `DEV_GLOMAR_QUERY`) once and shares the cookie with every test. Dev also has a Cloudflare bot check on `wp-login.php` and `wp-admin`, so login tests fail there until the runner gets a bypass. Playground has neither.

If a run crashes before its teardown, `TEST_ENV=dev npm run test:e2e:cleanup` lists content older than two hours left by earlier runs, and `test:e2e:cleanup:apply` deletes it.

## Environment variables

The scripts above cover the usual cases. These variables are for anything else:

| Variable | Default | Purpose |
|---|---|---|
| `TEST_ENV` | `playground` | `dev`, `staging`, or `production` to run against a live site from `.env` |
| `WP_VERSION` | `extra.wordpress-version` in `composer.json` | WP version, `latest`, `beta`, `nightly`, or a zip URL |
| `WP_BASE_URL` | Playground on `E2E_PORT` | Run against another throwaway site (Lando, review app) instead of booting Playground. For shared sites, use `TEST_ENV` |
| `E2E_PORT` | `9500` | Port for the Playground site that tests boot |
| `A11Y_BEST_PRACTICE` | on | Set to `0` to skip best-practice rules |
