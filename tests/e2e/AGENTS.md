# E2E (QA) – Agent Instructions

Applies to work under `tests/e2e/`. The person working here is a QA engineer; treat `user_role = developer` as the persona, with QA focus.

## Context

- Tests run on a fresh WordPress Playground site by default: `playground/blueprint.json` installs the repo's theme and plugins, the pages in `fixtures/`, and throwaway `admin` and `editor` accounts (see `playground/accounts.js`). It has no Glomar gate or Cloudflare check. `TEST_ENV=local|dev|staging|production` runs the same suite against an existing site instead, configured only by `.env.<target>` (`local` is a throwaway site you run, such as Lando). Ignore root instructions about Lando, `lando wp`, and PHP linting; the one-time setup in `README.md` still applies.
- Every test must pass on both. Live sites have editable content and Playground has only the fixtures, so never assume a menu, page, or post exists.
- The theme in `wp-content/themes/core/` is reference material for selectors and behavior. Read templates (`templates/`, `parts/`) and block source (`blocks/`) to understand rendered markup. Don't edit theme code from QA branches.
- Dev is behind the Glomar access gate. `setup/glomar.setup.js` unlocks it once per run via `GLOMAR_QUERY` and shares the cookie through `storageState`; specs never add `?secret=1` themselves. A spec that needs a context without the cookie must opt out explicitly with `test.use( { storageState: { cookies: [], origins: [] } } )`.
- Dev has a Cloudflare bot check on `wp-login.php` and `wp-admin`. Automation can't pass it; login tests fail with a clear message until the team adds a bypass. Never try to evade it.
- Scripts live in the root `package.json` as `test:e2e:*`. Run them from the repo root with Node from `.nvmrc` (`source ~/.nvm/nvm.sh && nvm use`).
- Code is CommonJS JavaScript in the repo's style: `npx wp-scripts format "tests/e2e/**/*.js"` and `npm run test:e2e:lint` must pass.

## Safety

- Every test carries exactly one of `@readonly` or `@mutating`, plus a type (`@smoke`, `@functional`, `@a11y`, `@visual`) and `@requires-account` if it logs in. `npm run test:e2e:lint` enforces the safety tag. Production runs only `@readonly` tests, so an untagged test never runs there.
- Mutating means the test changes site state, including content, accounts, or security counters. A failed login is mutating.
- Production registers only `@readonly` tests without `@requires-account`. Don't weaken this, the lint, or `retries: 0` outside Playground.
- Never change core settings (REST `/wp/v2/settings` or the Settings screens). Settings tests only read.
- Never edit templates, template parts, patterns or global styles, because they're global to every visitor. Test them by rendering them on a fixture page: assign the template, or embed a `wp:template-part` / `wp:pattern` block. This holds until the team decides otherwise.
- Never retry a failed login. Security plugins can lock accounts or IPs.
- Never print, log, or commit credentials. They come only from `.env.<target>` (`QA_<ROLE>_USER` / `QA_<ROLE>_PASSWORD`); the only exception is Playground's throwaway accounts in `playground/accounts.js`.
- Run only against Playground or the URLs in `.env.<target>` files. Committed files are publicly readable on Dokku deploys, so nothing secret goes in a committed file.

## Writing tests

- The QA Automation Planner (https://docs.google.com/spreadsheets/d/1-pUY-ERPRWNSq-vQc6Im7S8GtqKsN00glyMHsW2vnIc/edit?gid=1030867211, private; ask for a CSV export) is the test inventory: one row per topic with its category, priority, Automate?, test type, safety, content approach, and requirements. Check a topic's row before writing its tests. Treat the Notes column as hints, not facts: verify against the real site, Learn ModernPress, and the theme code.
- Specs live in `specs/<category>/<topic>.spec.js`. The folder is the planner's Category (Folders) value; where it disagrees with the theme code, the planner wins. The file name is the planner's Topic lowercased, with every run of non-alphanumerics replaced by one hyphen (`Media & Text` → `media-text`, `Site Header - Primary Menu` → `site-header-primary-menu`). A test that covers several topics lives with the highest-priority one; mention it in the other topics' notes.
- Every spec opens with a `/** … */` comment summarizing what it covers, in one or two sentences; `npm run test:e2e:lint` enforces it. The coverage map (`npm run test:e2e:coverage`) shows it under the spec. A test may add a `description` annotation (`{ annotation: { type: 'description', description: '…' } }`) when its title doesn't explain it, such as why it's `@mutating`.
- Import `test` and `expect` from `support/test.js`.
- `specs/smoke.spec.js` and `specs/a11y.spec.js` run page-level checks on every page in `specs/pages.js`, in `chromium` and `webkit-mobile`. Pages marked `fixture` exist only on Playground; `pages.js` leaves them out elsewhere.
- Tags come from the planner row: its Test type, plus `@readonly` or `@mutating` per test (a "Both" row has some of each). A test that logs in adds `@requires-account`. A test of phone behavior adds `@mobile`, which also runs it on the emulated iPhone (`webkit-mobile`); keep its `viewports.mobile` so it checks the same width in Chromium. Leave hover, arrow-key, and in-between-width tests in Chromium only.
- One behavior per test. Titles are stable IDs in kebab case, so the full ID is `category/topic/behavior`, e.g. `administration/wp-login/wrong-password-shows-error`. Don't rename a test once it exists.
- Learn ModernPress (https://learn.tri.be/) documents the intended behavior per topic; read the topic's page before designing a test. It doesn't separate ModernPress features from core WordPress. Where it's silent or unclear, ask instead of assuming.
- Inspect the real page before writing selectors; never guess markup or WordPress behavior. Prefer role/label locators (`getByRole`, `getByLabel`), then stable theme classes (`site-header`, `site-footer`, block `wp-block-tribe-*` classes). Avoid inline styles, nth-child chains, and editor-generated IDs.
- Shared helpers in `support/`:
  - `viewports.js`: `viewports.mobile` (390), `.mid` (870) and `.desktop` (1440), worked out from the breakpoints (columns stack at 781, mobile nav at 959, overridable in `.env.<target>`). Use them with `test.use( { viewport } )`, put the viewport name in the test title, and add `viewportTags( name )` to the tags when looping over viewports, so the mobile one gets `@mobile`.
  - `menus.js`: the confirmed dropdown behavior as `dropdownChecks` (open on click, not hover; Escape closes and returns focus to the parent; toggles set `aria-expanded`; arrow keys do nothing; focus stays on the parent and the next Tab enters the sub-menu), plus `firstDropdown()` and `expectSameOriginLinksOk()`. Menu specs loop over `dropdownChecks` so each menu gets the same checks.
  - `a11y.js`: `expectNoAxeViolations( page, { include, exclude } )`, the one axe check: WCAG 2.x A/AA plus best practices, failing on any violation and attaching the full results. Component specs scope it with `include`; whole-page scans belong only in `specs/a11y.spec.js`. Never disable a rule to get a pass.
  - `test.js` blocks requests to other hosts automatically.
- Tests that need content use the `api` fixture: `api.createPost`, `createPage`, `createTerm`, `uploadMedia`, `get`. Every item gets the `qa-auto-<runId>-` prefix, is recorded in the run ledger, and is permanently deleted after the test, with `global-teardown.js` as the backstop. The fixture skips without the automation account; Playground always has one. Never create content any other way, and never add client methods for settings, templates, template parts, or global styles.
- Pages and posts are created as drafts unless the test sets `status`. Pass a fixed `date` when output depends on it.
- Logged-in tests use `test.use( { role: 'editor' } )`; the fixture loads that role's saved session and skips with the missing variable names if it has none.
- Login success means the URL is under `/wp-admin/` and the admin bar is visible. Some roles land on their profile, not the Dashboard.
- No fixed waits and no `test.only`; `npm run test:e2e:lint` enforces both, and its Playwright rules fail on warnings too. Name assertion helpers `expect*` so the lint sees their assertions. Tests are independent and either bring their own uniquely named content (and clean it up) or skip. Never assume content exists, and never modify or delete existing content.
- Don't assert on placeholder or editable content (e.g. "Masthead CTA") — it differs per environment.
- Run tests yourself and share only failing output. Don't drive a browser by hand for regression checks.

## Unverified assumptions

Check these against the real site before relying on them, then move them out of this list.

- `TEST_ENV=local` and `IGNORE_HTTPS_ERRORS` were checked against a self-signed test server, not yet against a real Lando or Local site, and the account steps in `README.md` are untried.
- The login form uses core WordPress labels ("Username or Email Address", "Password", "Log In") and `#login_error`, and administrators and editors land under `/wp-admin/`. Verified on Playground; not yet on Dev, where Cloudflare blocks logins and security plugins may change the form.

## Planned changes

- **Credentials move to 1Password.** `.env.<target>` files hold plain-text credentials while the suite is in development. They'll switch to `op://` references injected with `op run`, matching how the repo already gets Composer licenses.
- **Cloudflare bypass for Dev and Staging logins.** Not designed yet; it covers every site with a bot check, including client sites. Options under consideration: client certificates (mTLS) with a WAF skip rule (preferred), or a secret request header with a skip rule. It should be a per-site setting in `.env.<target>` and `env.js`, never a workaround in specs. First find which Cloudflare feature issues the challenge: Bot Fight Mode can't be skipped by rules.
- **Revisit third-party blocking.** `support/test.js` aborts every request to another host (embeds, fonts, analytics, CDNs), so a slow or broken third party can't fail a test. The cost is scope: smoke tests don't catch broken third-party assets, and axe scans see pages without third-party content, such as embeds and externally hosted fonts. Decide which third parties are in scope (for example, an allowlist per site) before relying on these results for them.

## Critical Gotchas

### Playground needs `vendor/`

The core plugin loads `vendor/autoload.php` and crashes on boot without it. Run `composer create-auth` and `composer install` from the one-time setup in `README.md` first.

### `composer create-auth` with several 1Password accounts

`op` fails with "multiple accounts found" when you're signed in to more than one account. Pick the Modern Tribe one: `OP_ACCOUNT=moderntribe.1password.com composer create-auth`.

### Put paths before `--fix` in `wp-scripts lint-js`

`wp-scripts` reads the word after a flag as that flag's value, so `lint-js --fix some/file.js` sees no path and lints (and fixes) the whole repo, including `wp-content/plugins/`. Put paths first: `npx wp-scripts lint-js --config tests/e2e/eslint.config.js tests/e2e --fix`. `npm run test:e2e:lint -- --fix` doesn't work either, because npm passes the extra argument to `lint-specs.js`.

## Git

Follow `tests/e2e/README.md`: branch as `feature/qa/<topic>`, push only to `origin`, open PRs with `--repo ironprogrammer/ModernPress --base feature/qa/playwright-e2e`.
