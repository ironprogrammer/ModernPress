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
| `npm run test:e2e:lint` | ESLint with WordPress's Playwright rules (no `.only`, no fixed waits), and a check that every test has one safety tag. Run before pushing |

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

The same suite runs against an existing site with `npm run test:e2e:dev`, `test:e2e:staging`, `test:e2e:production`, or `test:e2e:local` (a throwaway site you run, such as Lando or a review app). Each target reads only its own settings file: copy `tests/e2e/.env.example` to `tests/e2e/.env.<target>` (for example `.env.dev`) and fill in the URL, Glomar query, and test accounts. These files are git-ignored; never commit credentials. They hold plain-text credentials for now, which will move to 1Password references later.

Projects:

- `chromium` runs every test that doesn't need a login, in desktop Chrome at 1440×900. Tests that check responsive behavior set their own viewport (390, 870, or 1440 wide), so this project covers the breakpoints too.
- `webkit-mobile` also runs tests tagged `@mobile` on an emulated iPhone 15: WebKit, touch, and a phone user agent. That covers the page-level smoke and a11y specs and the mobile header tests. It's emulation, not a device; `MANUAL.md` lists the device checks.
- `chromium-account` runs `@requires-account` tests after `auth-setup` logs in once per role in `QA_ROLES`, so a failed login only blocks tests that need it. A role without credentials is skipped, and logins are never retried.
- Production runs only `@readonly` tests, in `chromium` and `webkit-mobile`. Nothing logs in or writes there. Fixture pages are left out on every site except Playground.

Tests that create content do it through the REST API as the automation account (`QA_AUTOMATION_USER` / `QA_AUTOMATION_APP_PASSWORD`). Each item is named with the run's `qa-auto-<runId>-` prefix and deleted after its test; the global teardown deletes anything left over and fails the run if it can't.

Dev is behind the Glomar access gate: `glomar-setup` visits `/?secret=1` (from `GLOMAR_QUERY` in `.env.dev`) once and shares the cookie with every test. Dev also has a Cloudflare bot check on `wp-login.php` and `wp-admin`, so login tests fail there until the runner gets a bypass (not designed yet). Playground has neither.

### Local sites

`TEST_ENV=local` works with any local site you run (Lando, Docker Compose, wp-env, DDEV, Local): put its URL and accounts in `tests/e2e/.env.local` and run `npm run test:e2e:local`. ModernPress local configs set `WP_ENVIRONMENT_TYPE` to `local`, so Glomar is off and application passwords work without HTTPS.

Create the test accounts once with your tool's WP-CLI (`lando wp`, `ddev wp`, or Local's site shell):

```sh
# An editor for logged-in tests. Use your own admin account as the administrator.
wp user create qa-editor qa-editor@example.test --role=editor --user_pass='<choose a password>'
# An application password for the REST client; prints it once.
wp user application-password create <your-admin-login> e2e-automation --porcelain
```

Then fill in `.env.local`: `QA_ADMINISTRATOR_USER` / `_PASSWORD` with your admin login, `QA_EDITOR_USER=qa-editor` and its password, and `QA_AUTOMATION_USER=<your-admin-login>` with the printed application password, in quotes.

If the site uses a self-signed HTTPS certificate (Lando's `*.lndo.site`, Local's SSL option), set `IGNORE_HTTPS_ERRORS=1` in `.env.local`. It's refused for every other target. If the certificate authority is installed on your machine, as Lando does, `NODE_OPTIONS=--use-system-ca` keeps verification on instead.

If a run crashes before its teardown, `TEST_ENV=dev npm run test:e2e:cleanup` lists content older than two hours left by earlier runs, and `TEST_ENV=dev npm run test:e2e:cleanup -- --apply` deletes it.

## Environment variables

The scripts above cover the usual cases. These variables are for anything else:

| Variable | Default | Purpose |
|---|---|---|
| `TEST_ENV` | `playground` | `local`, `dev`, `staging`, or `production` to run against an existing site from `.env.<target>` |
| `WP_VERSION` | `extra.wordpress-version` in `composer.json` | WP version, `latest`, `beta`, `nightly`, or a zip URL |
| `E2E_PORT` | `9500` | Port for the Playground site that tests boot |
| `A11Y_BEST_PRACTICE` | on | Set to `0` to skip best-practice rules |
