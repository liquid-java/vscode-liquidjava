#!/bin/bash

VERSION=$1

# check if version argument provided
if [ -z "$VERSION" ]; then
    echo "Usage: $0 1.2.3"
    exit 1
fi

# check valid version format
if [[ ! $VERSION =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Version must be in format 1.2.3"
    exit 1
fi

# check if version present in package.json
if ! grep -q "\"version\": \"$VERSION\"" ./client/package.json; then
    echo "Version $VERSION not found in package.json"
    exit 1
fi

# check if version tag already exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo "Release $VERSION already exists"
    exit 1
fi

git checkout main
git pull
git status
git add .
git commit -m "Release $VERSION"
git tag -a "v$VERSION" -m "vscode-liquidjava $VERSION"

git push
git push --tags