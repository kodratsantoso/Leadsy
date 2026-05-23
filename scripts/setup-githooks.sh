#!/usr/bin/env sh
set -eu

git config core.hooksPath .githooks || true
printf "Git hooks path configured to .githooks\n"
