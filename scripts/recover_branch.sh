#!/usr/bin/env bash
#
# Attach this working tree to its real remote history — safely.
#
#   scripts/recover_branch.sh            # inspect only, changes nothing
#   scripts/recover_branch.sh --apply    # perform the reconciliation
#
# WHY THIS EXISTS
# ---------------
# The sandbox is periodically re-cloned at `24437a5`, an initial commit that
# contains a single one-line README. The completed implementation (~549 files)
# is present in the working tree but shows up as *untracked*, because the base
# commit knows nothing about it. `git add . && git commit` there would squash
# the entire project — every phase, and the real commit chain on the remote —
# into one blob that only a force-push could reconcile. That is destructive and
# is exactly what this script exists to prevent.
#
# The correct operation is `git reset --mixed <remote tip>`: it moves HEAD and
# the index onto the real history and leaves every file on disk untouched, so
# `git status` collapses from "549 untracked" to the true delta.
#
# Note the refspec step below is NOT redundant. `.git/config` is excluded from
# workspace snapshots, so a widened refspec does not survive between sessions
# and `origin/arena/*` is invisible until it is widened again.
#
# SAFETY
# ------
# * takes a full backup of every git-relevant file BEFORE touching anything
# * never runs reset --hard, clean, or any force-push
# * refuses to continue if the remote branch is missing
# * after the reset, restores any file the reset would have marked deleted,
#   then re-verifies — a ' D' entry must never survive into a commit
set -uo pipefail

BRANCH="${RECOVER_BRANCH:-arena/01a0e69d-knowledge-marketplace}"
REMOTE="${RECOVER_REMOTE:-origin}"
APPLY=0
COMMIT=0
for arg in "$@"; do
  case "$arg" in
    --apply) APPLY=1 ;;
    --commit) APPLY=1; COMMIT=1 ;;
    --branch=*) BRANCH="${arg#*=}" ;;
    -h|--help) sed -n '2,32p' "$0"; exit 0 ;;
    *) echo "unknown argument: $arg" >&2; exit 2 ;;
  esac
done

ok()   { printf '  \033[32mOK\033[0m    %s\n' "$1"; }
bad()  { printf '  \033[31mFAIL\033[0m  %s\n' "$1"; }
note() { printf '\n== %s\n' "$1"; }
die()  { bad "$1"; exit 1; }

cd "$(git rev-parse --show-toplevel)" || die "not inside a git repository"

note "Current state"
echo "  branch : $(git rev-parse --abbrev-ref HEAD)"
echo "  HEAD   : $(git log --oneline -1)"
echo "  staged : $(git add -An . 2>/dev/null | wc -l | tr -d ' ') files would be added at this base"

note "Widening the fetch refspec (does not persist across sessions)"
git config --unset-all "remote.${REMOTE}.fetch" 2>/dev/null
git config --add "remote.${REMOTE}.fetch" "+refs/heads/*:refs/remotes/${REMOTE}/*"
ok "remote.${REMOTE}.fetch = +refs/heads/*:refs/remotes/${REMOTE}/*"

note "Fetching"
if ! git fetch --prune "$REMOTE" 2>&1 | sed 's/^/  /'; then
  die "fetch failed — no GitHub connectivity. Nothing was changed."
fi
git rev-parse --verify "refs/remotes/${REMOTE}/${BRANCH}" >/dev/null 2>&1 \
  || die "refs/remotes/${REMOTE}/${BRANCH} does not exist. Nothing was changed."
TARGET="$(git rev-parse "refs/remotes/${REMOTE}/${BRANCH}")"
ok "${REMOTE}/${BRANCH} = ${TARGET:0:7}"

note "Remote branches"
git branch -r | sed 's/^/  /'

note "Ancestry of previously reported commits"
for c in d78196d 5decba4; do
  if git cat-file -e "$c^{commit}" 2>/dev/null; then
    if git merge-base --is-ancestor "$c" "$TARGET" 2>/dev/null; then
      echo "  $c : present, IS an ancestor of ${BRANCH}"
    else
      echo "  $c : present, NOT an ancestor of ${BRANCH}"
    fi
  else
    echo "  $c : not found on the remote"
  fi
done

if [[ "$APPLY" -ne 1 ]]; then
  note "Inspection only"
  echo "  Re-run with --apply to reconcile onto ${TARGET:0:7}."
  exit 0
fi

note "Backup before any mutation"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP="${TMPDIR:-/tmp}/hem-worktree-${STAMP}.tar.gz"
# Exactly the files git cares about: tracked + untracked-but-not-ignored.
git ls-files -co --exclude-standard -z > "${TMPDIR:-/tmp}/hem-files-${STAMP}.txt"
tar --null -czf "$BACKUP" -T "${TMPDIR:-/tmp}/hem-files-${STAMP}.txt" \
  || die "backup failed — refusing to continue"
ok "backup: $BACKUP ($(du -h "$BACKUP" | cut -f1), $(tr -cd '\0' < "${TMPDIR:-/tmp}/hem-files-${STAMP}.txt" | wc -c | tr -d ' ') files)"

note "Reconciling: git reset --mixed ${TARGET:0:7}  (index + HEAD only; files untouched)"
git reset --mixed "$TARGET" >/dev/null || die "reset failed — restore from $BACKUP"
ok "HEAD is now $(git log --oneline -1)"

note "Deletion guard"
mapfile -t DELETED < <(git status --porcelain | awk '/^ D/{print substr($0,4)}')
if [[ "${#DELETED[@]}" -gt 0 ]]; then
  bad "${#DELETED[@]} file(s) present in the remote tree are missing on disk — restoring"
  for f in "${DELETED[@]}"; do
    git checkout -- "$f" && echo "    restored: $f"
  done
  mapfile -t STILL < <(git status --porcelain | awk '/^ D/{print substr($0,4)}')
  [[ "${#STILL[@]}" -eq 0 ]] || die "still deleted after restore: ${STILL[*]} (backup: $BACKUP)"
fi
ok "no deletions pending"

note "The true delta (review this before committing)"
git status --porcelain | sed 's/^/  /'
echo
git diff --stat | tail -20 | sed 's/^/  /'

if [[ "$COMMIT" -ne 1 ]]; then
  note "Next"
  cat <<EOS
  1. Review the delta above — it must be the marketing/SEO work and the slug fix,
     not a reconstruction of the whole project.
  2. Run the suites (scripts/run_tests.sh, or the commands in PROJECT-HANDOFF.md).
  3. Re-run with --commit (or: git add -A && git commit)
  4. git push ${REMOTE} ${BRANCH}        # NO --force, ever
  Backup of the pre-reset tree: $BACKUP
EOS
  exit 0
fi

note "Committing"
# Refuse to create the squash this script exists to prevent: if the delta is
# enormous, HEAD is almost certainly still the truncated base rather than the
# real branch tip, and committing would collapse the whole project into one blob.
PENDING="$(git status --porcelain | wc -l | tr -d ' ')"
LIMIT="${RECOVER_MAX_DELTA:-200}"
if [[ "$PENDING" -gt "$LIMIT" ]]; then
  die "refusing to commit $PENDING changed files (limit $LIMIT).
       That is the size of a whole-project squash, not an incremental delta.
       Verify HEAD really is ${BRANCH}'s tip, then re-run with
       RECOVER_MAX_DELTA=<n> if the number is genuinely expected."
fi
git add -A
# Re-check after staging: a deletion must never be committed silently.
STAGED_DEL="$(git diff --cached --name-only --diff-filter=D | wc -l | tr -d ' ')"
[[ "$STAGED_DEL" -eq 0 ]] || die "$STAGED_DEL staged deletion(s) — aborting. Backup: $BACKUP"

git commit -q -F - <<'MSG'
feat(marketing): subject pages, expert pitch, about + directory SEO

Completes the public marketing surface and closes the remaining SEO gaps.

- subjects API (`GET /api/v1/subjects`, `/api/v1/subjects/{slug}`) in apps.experts
- `/subjects` and `/subjects/[slug]` pages; category parents are never linked
  (categories have no landing page, so linking them guarantees a 404)
- `/for-experts` supplier-facing pitch and `/about`
- shared `lib/api/public.ts` helper — one `{ data, notFound }` contract, so a
  definitive 404 is distinguishable from an API outage and failures are never cached
- per-page metadata, canonical, Open Graph and JSON-LD; sitemap and robots updates;
  footer navigation; expert-profile subject links
- server `layout.tsx` for `/experts` and `/experts/[slug]`, giving the directory
  real per-expert titles, canonicals and ProfilePage/Person structured data without
  touching the tested client components
- root layout awaits headers() so every document route renders on demand: a
  prerendered page cannot carry a per-request CSP nonce, and under 'strict-dynamic'
  that blocked all JavaScript on 33 of 45 routes (ADR-0018)
- deterministic `test_slug_uniqueness` — order_by("pk"); an UPDATE moves a row to the
  heap tail, so an unordered queryset could return the deduped slug first
MSG
ok "committed $(git log --oneline -1)"

note "Next — push (this script never pushes for you)"
cat <<EOS
  git push ${REMOTE} ${BRANCH}          # NO --force, ever
  Then verify: git log --oneline --decorate -3
  Backup of the pre-reset tree: $BACKUP
EOS
