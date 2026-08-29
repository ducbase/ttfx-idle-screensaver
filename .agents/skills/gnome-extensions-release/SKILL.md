---
name: gnome-extensions-release
description: Publish a new version of this GNOME Shell extension to GitHub Releases and extensions.gnome.org (EGO). Use for release preparation, EGO uploads, review-status checks, and the one-time public listing media setup; not for ordinary extension development.
---

# GNOME Extensions Release

## Scope and authorization

Use this skill from this repository when the user asks to create a public
release or submit/update it on EGO. Preserve unrelated working-tree changes and
stage explicit paths only. Never read, print, persist, or use browser
credentials, browser session state, or private browser data.

EGO actions have two separate public side effects. Stop for explicit user
confirmation immediately before clicking its final **Upload extension** button
and before uploading or replacing public listing media. Do not bypass login,
CAPTCHAs, browser file-access restrictions, EGO validation, or reviewer
feedback; report the precise blocker instead.

## Release workflow

1. Inspect the current branch, `origin/main`, latest GitHub Release, and the
   requested release scope. Do not tag a feature branch: release only from
   merged `main`.
2. Run the release checks before publication:

   ```bash
   node --test tests/idle-watch-controller.test.mjs \
     tests/preview-preferences.test.mjs \
     tests/renderer-dismissal.test.mjs
   glib-compile-schemas --strict --dry-run schemas
   ./tools/package.sh
   unzip -t dist/ttfx-idle-screensaver@ducbase.com.zip
   unzip -l dist/ttfx-idle-screensaver@ducbase.com.zip
   git diff --check
   ```

   Confirm that the ZIP has the source schema XML and does not contain
   `schemas/gschemas.compiled`.
3. If release-related documentation or workflow changes are needed, use a
   focused PR with a short, user-facing imperative title. Wait for requested
   review and passing CI before merging. Preserve unrelated files.
4. Create and push the next `v*` tag from merged `main`. Wait for the tag
   workflow to pass and for the GitHub Release asset to exist.
5. Download the exact published ZIP and validate it again before EGO upload.
   Compare the downloaded file's SHA-256 with the asset digest shown by
   `gh release view`; do not substitute a locally rebuilt archive.

## EGO submission

Use the user's authenticated EGO browser session. Open the upload form, attach
the verified GitHub Release ZIP, and inspect the form state. If browser file
access is disabled, ask the user to enable it rather than using another upload
route. Accept EGO's required acknowledgements only in the scope of the
requested submission, then ask for confirmation at the final Upload button.

After submission, verify and report the public extension URL, the review URL,
the EGO version number/status, and supported Shell versions. An **Unreviewed**
submission is successful initial delivery; do not claim reviewer approval until
EGO marks it active.

## Public listing media

For a new listing, add representative public media after submission. A static
screenshot or the repository's animated WebP demo are suitable. Listing media
is not a release artifact: leave it in place for later releases and replace it
only when visible UI materially changes. Require explicit confirmation just
before the media is uploaded or replaced.
