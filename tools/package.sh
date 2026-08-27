#!/usr/bin/env bash
set -euo pipefail
repo_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
uuid=$(jq -r .uuid "$repo_dir/metadata.json")
out_dir="$repo_dir/dist"
rm -rf "$out_dir"
mkdir -p "$out_dir/$uuid/schemas"
cp "$repo_dir/metadata.json" "$repo_dir/extension.js" "$repo_dir/prefs.js" "$repo_dir/renderer.js" "$out_dir/$uuid/"
cp -R "$repo_dir/art" "$out_dir/$uuid/"
cp "$repo_dir/schemas"/*.xml "$out_dir/$uuid/schemas/"
(cd "$out_dir/$uuid" && zip -qr "../$uuid.zip" .)
echo "$out_dir/$uuid.zip"
