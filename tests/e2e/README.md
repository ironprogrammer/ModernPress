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
