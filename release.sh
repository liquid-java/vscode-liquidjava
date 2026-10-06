#!/usr/bin/env bash

set -euo pipefail

usage() {
    echo "Usage: ./release.sh [VERSION] | ./release.sh --tag VERSION" >&2
}

MODE="pr"
if [[ "${1:-}" == "--tag" ]]; then
    MODE="tag"
    shift
fi

if [[ $# -gt 1 ]] || [[ "$MODE" == "tag" && $# -ne 1 ]]; then
    usage
    exit 1
fi

VERSION="${1:-}"
if [[ -n "$VERSION" && ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version must be in format 1.2.3" >&2
    exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" ]]; then
    echo "Releases must start from main (current: $CURRENT_BRANCH)" >&2
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Releases require a clean working tree" >&2
    exit 1
fi

git pull --ff-only origin main
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/main)" ]]; then
    echo "Local main must match origin/main before releasing" >&2
    exit 1
fi

if [[ "$MODE" == "tag" ]]; then
    CURRENT_VERSION=$(node -p "require('./client/package.json').version")
    if [[ "$CURRENT_VERSION" != "$VERSION" ]]; then
        echo "Version $VERSION is not the version on main ($CURRENT_VERSION)" >&2
        exit 1
    fi

    if git rev-parse --quiet --verify "refs/tags/v$VERSION" >/dev/null; then
        echo "Release $VERSION already exists" >&2
        exit 1
    fi
    REMOTE_TAG=$(git ls-remote --tags origin "refs/tags/v$VERSION")
    if [[ -n "$REMOTE_TAG" ]]; then
        echo "Release $VERSION already exists" >&2
        exit 1
    fi

    git tag -a "v$VERSION" origin/main -m "vscode-liquidjava $VERSION"
    git push origin "refs/tags/v$VERSION"
    exit 0
fi

if ! command -v gh >/dev/null 2>&1; then
    echo "GitHub CLI (gh) is required to create the release pull request" >&2
    exit 1
fi

if [[ -z "$VERSION" ]]; then
    VERSION=$(node -e 'const [major, minor, patch] = require("./client/package.json").version.split(".").map(Number); console.log(`${major}.${minor}.${patch + 1}`)')
fi

CURRENT_VERSION=$(node -p "require('./client/package.json').version")
if [[ "$CURRENT_VERSION" == "$VERSION" ]]; then
    echo "Version $VERSION is already on main; choose a new version" >&2
    exit 1
fi

BRANCH="codex/release-$VERSION"
if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
    echo "Release branch $BRANCH already exists" >&2
    exit 1
fi
REMOTE_BRANCH=$(git ls-remote --heads origin "refs/heads/$BRANCH")
if [[ -n "$REMOTE_BRANCH" ]]; then
    echo "Release branch $BRANCH already exists" >&2
    exit 1
fi

if git rev-parse --quiet --verify "refs/tags/v$VERSION" >/dev/null; then
    echo "Release $VERSION already exists" >&2
    exit 1
fi
REMOTE_TAG=$(git ls-remote --tags origin "refs/tags/v$VERSION")
if [[ -n "$REMOTE_TAG" ]]; then
    echo "Release $VERSION already exists" >&2
    exit 1
fi

git switch -c "$BRANCH"
(cd client && npm version "$VERSION" --no-git-tag-version >/dev/null)
git add client/package.json client/package-lock.json
git commit -m "Release $VERSION"
git push --set-upstream origin "$BRANCH"

gh pr create \
    --base main \
    --head "$BRANCH" \
    --title "Release $VERSION" \
    --body "Prepare version $VERSION for release. Merge this pull request after Checks pass, then run ./release.sh --tag $VERSION from main to publish."

printf 'After the release pull request is merged, run ./release.sh --tag %s from main to publish.\n' "$VERSION"
