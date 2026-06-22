#!/usr/bin/env bash
set -euo pipefail

HUGO_VERSION="${HUGO_VERSION:-0.163.3}"

if ! command -v hugo >/dev/null 2>&1; then
  tmp_dir="$(mktemp -d)"
  curl -sL "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_extended_${HUGO_VERSION}_linux-amd64.tar.gz" \
    | tar xz -C "${tmp_dir}"
  export PATH="${tmp_dir}:${PATH}"
fi

args=(build --cleanDestinationDir)
if [ -n "${CF_PAGES_URL:-}" ]; then
  args+=(--baseURL "${CF_PAGES_URL}")
fi

hugo "${args[@]}"
