#!/usr/bin/env bash
set -euo pipefail

npm run build

npx @anthropic-ai/dxt pack "$@"

latest_dxt="$(ls -t ./*.dxt 2>/dev/null | head -n 1 || true)"
if [[ -z "${latest_dxt}" ]]; then
  echo "No .dxt artifact was produced by the pack step." >&2
  exit 1
fi

mcpb_path="${latest_dxt%.dxt}.mcpb"
cp "${latest_dxt}" "${mcpb_path}"

echo "Created: ${mcpb_path}"
