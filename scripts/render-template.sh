#!/usr/bin/env bash
# Renders a scaffold template into a target directory.
# Shared by .github/workflows/create-repo.yml and .github/workflows/ci.yml so that
# verified output matches provisioned output. Source templates are never modified.
set -euo pipefail

APP_TYPE="${1:?usage: render-template.sh <app-type> <repo-name> <target-dir>}"
REPO_NAME="${2:?usage: render-template.sh <app-type> <repo-name> <target-dir>}"
TARGET_DIR="${3:?usage: render-template.sh <app-type> <repo-name> <target-dir>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SCAFFOLD_DIR="$SCRIPT_DIR/../templates/$APP_TYPE"

if [ ! -d "$SCAFFOLD_DIR" ]; then
  echo "::error::Scaffold template not found for app type: $APP_TYPE"
  exit 1
fi

mkdir -p "$TARGET_DIR"
cp -r "$SCAFFOLD_DIR/." "$TARGET_DIR/"

find "$TARGET_DIR" -type f \( -name "*.md" -o -name "*.xml" -o -name "*.toml" \
  -o -name "*.json" -o -name "*.csproj" -o -name "*.sln" -o -name "*.txt" \
  -o -name "*.cs" -o -name "*.java" -o -name "*.py" \) \
  -exec sed -i "s/APP_NAME/$REPO_NAME/g" {} +

# Paths must be renamed too, otherwise substituted project references (such as the
# .NET solution) point at files that do not exist. -depth renames children first.
while IFS= read -r item; do
  renamed="$(dirname "$item")/$(basename "$item" | sed "s/APP_NAME/$REPO_NAME/g")"
  mv "$item" "$renamed"
done < <(find "$TARGET_DIR" -depth -name '*APP_NAME*')

if grep -rlq "APP_NAME" "$TARGET_DIR"; then
  echo "::error::Unsubstituted APP_NAME placeholders remain in $TARGET_DIR"
  grep -rl "APP_NAME" "$TARGET_DIR"
  exit 1
fi

echo "Rendered '$APP_TYPE' template as '$REPO_NAME' into $TARGET_DIR"
