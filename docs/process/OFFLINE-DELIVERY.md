# Offline delivery — getting this work onto GitHub without Arena

The Arena sandbox that produced this work has **package-registry-only egress** and is
issued a placeholder credential (`GH_TOKEN=arena-egress-dummy-token`), so it cannot
push. This document is the escape hatch: it puts the completed implementation on
GitHub from **any** machine that has normal GitHub access, using nothing but a source
archive and stock git.

Nothing here rebuilds or modifies the application.

---

## 1. Take the archive out of the workspace

A verified archive of exactly the git-relevant files is written to the workspace root:

```
/home/user/hem-source-<UTC timestamp>.tar.gz
```

* **550 files, ~650 KB**
* contains tracked + untracked-but-not-ignored files only — no `node_modules`,
  no `.next`, no `.venv`, no `var/`, no caches, no local databases
* the only `.env*` files are `.example` templates containing placeholders
  (`CHANGE_ME_…`, `dev-only-…`); a sweep for `ghp_`, `github_pat_`, `sk_live_`,
  `AKIA…` and private-key headers found only a `sk_live_x` **test fixture** whose
  purpose is asserting that production checks reject live keys
* verified on creation by extracting it and diffing every file byte-for-byte
  against the live tree — 0 mismatches

Download it through the Arena file viewer. Record the `sha256` printed alongside it so
you can confirm the copy that lands on your machine is intact.

---

## 2. Reconstruct the branch on a connected machine

```bash
git clone https://github.com/shaheenaslam10/knowledge-marketplace.git
cd knowledge-marketplace
git fetch origin '+refs/heads/*:refs/remotes/origin/*'     # default refspec hides arena/*
git checkout arena/01a0e69d-knowledge-marketplace           # the real history
git log --oneline -5                                        # expect the chain ending at d78196d
```

If that branch is gone (PR #3 may have been merged or closed), branch from whatever the
canonical branch now is and open a fresh PR — **never** force-push over it.

---

## 3. Lay the completed source over the real history

```bash
tar -xzf /path/to/hem-source-<timestamp>.tar.gz -C .
git status --short
```

Because you extracted onto a real checkout, `git status` now shows the **true delta**:
the marketing/SEO work, the CSP fix and the slug fix — not 550 files.

### The one check that matters

```bash
git status --porcelain | grep '^ D'
```

**This must print nothing.** A ` D` entry means the branch contains a file the archive
does not, so `git add -A` would silently commit its deletion. Restore any such file and
re-check:

```bash
git checkout -- <path>
```

(Extracting an archive never removes files, so a ` D` here means the file was lost from
the sandbox rather than deliberately deleted.)

---

## 4. Validate, commit, push

```bash
# backend
cd backend && pytest && ruff check . && ruff format --check . && lint-imports \
  && python manage.py makemigrations --check --dry-run
# frontend
cd ../frontend && npm ci && npm test && npm run lint && npm run typecheck && npm run build
```

Expected, as last verified from a clean rebuild: backend **439 passed**
(`test_slug_uniqueness` 25/25), frontend **143 passed / 25 files**, ESLint 0 warnings,
`tsc` clean, production build clean (45 dynamic routes, `/robots.txt` static, bundle
budgets respected). Playwright E2E was **13/13** and `scripts/smoke_test.sh` **24/24**
against a running stack; Docker Compose smoke has **never** been run — Docker was not
available in the sandbox, so do not report it as passing.

Then:

```bash
cd ..
git add -A
git commit      # see the message in scripts/recover_branch.sh for the full text
git push origin arena/01a0e69d-knowledge-marketplace     # NO --force, ever
git ls-remote origin refs/heads/arena/01a0e69d-knowledge-marketplace   # must equal git rev-parse HEAD
```

---

## 5. If you are inside a connected Arena session instead

Skip all of the above — the repository already carries a guarded script that does steps
2–4 in one command:

```bash
scripts/recover_branch.sh            # inspect: fetch, show ancestry, change nothing
scripts/recover_branch.sh --commit   # backup, fetch, reset --mixed, guards, commit
git push origin arena/01a0e69d-knowledge-marketplace
```

It refuses to run without connectivity, refuses if the branch is missing, restores files
that would show as deleted, and **refuses to commit a whole-project squash** (the
`RECOVER_MAX_DELTA` guard). It never runs `reset --hard`, `git clean`, or a force-push.

---

## What must not be claimed

Staging and production **do not exist** — nothing has been deployed. CI has never been
inspected from the sandbox, so its status is genuinely unknown. `/blog/*` is
intentionally out of MVP (`docs/product/mvp-scope.md`); do not add it.
