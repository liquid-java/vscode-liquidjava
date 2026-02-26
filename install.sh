#!/bin/bash
VERSION=$1
SKIP_SERVER=false

# check if version argument provided
if [ -z "$VERSION" ]; then
    echo "Usage: $0 1.2.3 [--skip-server]"
    exit 1
fi

# check for flags
if [ "$2" == "--skip-server" ]; then
    SKIP_SERVER=true
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

# build server jar
if [ "$SKIP_SERVER" = false ]; then
    cd server
    mvn clean package -DskipTests
    mkdir -p ../client/server
    cp target/language-server-liquidjava.jar ../client/server/
    cd ..
fi

# build and install vscode extension
cd client
npx vsce package
code --install-extension liquid-java-$VERSION.vsix
cd ..