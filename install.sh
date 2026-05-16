#!/bin/bash
SKIP_SERVER=false

# check for flags
if [ "$1" == "--skip-server" ]; then
    SKIP_SERVER=true
elif [ -n "$1" ]; then
    echo "Usage: $0 [--skip-server]"
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
npx vsce package --out liquid-java.vsix
code --install-extension liquid-java.vsix
cd ..
