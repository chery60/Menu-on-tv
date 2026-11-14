#!/bin/zsh
# QA's merge gate (D1): the full suite at one commit, in a throwaway worktree.
# Usage: .claude/qa/run-suite.sh <name> <sha> [port]
# Appends "<name> <sha> PASS|FAIL|INVALID-SLEPT <mins>m | <unit tests> | site: <checks>" to $QA_OUT/results.txt,
# with the full log in $QA_OUT/logs/<name>.log. On FAIL the worktree is kept for a look.
# One suite at a time on this computer: the lock below waits for any other run.
set -u
usage='usage: run-suite.sh <name> <sha> [port]'
name=${1:?$usage}; sha=${2:?$usage}; port=${3:-4360}
[[ $name =~ '^[A-Za-z0-9._-]+$' ]] || { print -u2 "name: letters, digits, dot, dash and underscore only"; exit 2; }
[[ $port =~ '^[0-9]+$' ]] || { print -u2 "port must be a number"; exit 2; }

repo=$(git -C "${0:A:h}" rev-parse --show-toplevel) || exit 2
out=${QA_OUT:-${TMPDIR:-/tmp}/menuontv-qa}
mkdir -p "$out/logs"
W="$out/wt-$name"; L="$out/logs/$name.log"; lock=${QA_LOCK:-${TMPDIR:-/tmp}/menuontv-suite.lock}

# The lock holds its owner's pid. A run that was killed outright leaves a dead pid, and the next run takes the lock over.
until mkdir "$lock" 2>/dev/null; do
  owner=$(cat "$lock/pid" 2>/dev/null)
  if [[ -n $owner ]] && ! kill -0 "$owner" 2>/dev/null; then rm -rf "$lock"; continue; fi
  sleep 15
done
print $$ > "$lock/pid"
trap 'rm -rf "$lock"' EXIT
trap 'exit 130' INT TERM HUP

cd "$repo" || exit 2
git fetch -q origin "+refs/pull/*/head:refs/remotes/pr/*" 2>/dev/null
git worktree add --detach "$W" "$sha" >/dev/null 2>&1 || { print "$name $sha WORKTREE-FAIL" >> "$out/results.txt"; exit 1; }
cd "$W" || exit 1

start=$(date +%s); since=$(date '+%Y-%m-%d %H:%M:%S')
# Keep the Mac awake for the run. A closed lid still sleeps, so the run checks afterwards.
caffeinate -i -s -w $$ &
: > "$L"
step() { print "=== $1" >> "$L"; shift; "$@" >> "$L" 2>&1; }

# The built site against src/verify's checks, on a production server on $port.
site() {
  [[ -f src/verify/check-built-site.mjs ]] || return 0
  print "=== site" >> "$L"
  if curl -s -o /dev/null "http://localhost:$port/"; then print "port $port is already in use" >> "$L"; return 1; fi
  ./node_modules/.bin/next start -p "$port" >> "$L" 2>&1 &
  local i
  for i in {1..60}; do curl -sf -o /dev/null "http://localhost:$port/" && break; sleep 1; done
  node src/verify/check-built-site.mjs "http://localhost:$port" >> "$L" 2>&1
  local rc=$?
  lsof -ti "tcp:$port" -sTCP:LISTEN | xargs kill 2>/dev/null
  return $rc
}

# typegen writes Next's route types (RouteContext, PageProps), which a fresh checkout lacks; older commits' typecheck doesn't run it.
if step npm-ci npm ci --no-audit --no-fund && step lint npm run lint && step typegen ./node_modules/.bin/next typegen \
  && step typecheck npm run typecheck \
  && step unit npm run coverage && step build npm run build && site; then
  res=PASS
else
  res=FAIL
fi

# A run the Mac slept through proves nothing either way: every timer jumps. Mark it, don't call it a result.
slept=$(pmset -g log 2>/dev/null | awk -v since="$since" '/Entering Sleep/ && ($1 " " $2) >= since' | head -1)
[[ -n $slept ]] && res=INVALID-SLEPT
mins=$(( ($(date +%s) - start) / 60 ))
unit=$(grep -E '^ +Tests ' "$L" | tail -1 | tr -s ' ')
sitechecks=$(sed -n '/^=== site$/,$p' "$L" | grep -cE '^PASS ')
sitefails=$(sed -n '/^=== site$/,$p' "$L" | grep -cE '^FAIL ')
print "$name $sha $res ${mins}m |$unit | site: $sitechecks passed, $sitefails failed" >> "$out/results.txt"
print "$name $sha $res ${mins}m (log: $L)"
if [[ $res == PASS ]]; then
  cd "$repo" && git worktree remove --force "$W"
fi
[[ $res == PASS ]]
