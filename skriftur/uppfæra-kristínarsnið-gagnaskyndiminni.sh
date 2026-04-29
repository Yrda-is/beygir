#!/usr/bin/env bash
set -euo pipefail

for command_name in brotli gh; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Finn ekki skipun: $command_name" >&2
    exit 1
  fi
done

csv_path=".gögn/KRISTINsnid.csv"
brotli_path=".gögn/KRISTINsnid.csv.br"
sha_path=".gögn/KRISTINsnid.csv.sha256sum"

if [[ ! -f "$csv_path" || ! -f "$sha_path" ]]; then
  echo "Vantar $csv_path eða $sha_path. Keyrðu fyrst: bun run sækja:gögn" >&2
  exit 1
fi

echo "Þjappa $csv_path í $brotli_path með brotli -q 5 ..."
brotli -f -q 5 -o "$brotli_path" "$csv_path"
brotli -t "$brotli_path"

gh release upload gagnaskyndiminni "$brotli_path" "$sha_path" --clobber
