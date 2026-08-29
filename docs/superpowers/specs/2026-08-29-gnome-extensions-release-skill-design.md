# GNOME Extensions release skill

Status: Approved

## Purpose

Provide a repository-local `gnome-extensions-release` skill for publishing a
new version of this GNOME Shell extension to GitHub Releases and submitting the
exact published ZIP to extensions.gnome.org (EGO).

## Workflow

The skill begins by checking the current GitHub release, repository state, and
the intended `main` commit. It preserves unrelated changes and never treats a
locally rebuilt archive as interchangeable with the published release asset.

Before tagging, it runs the repository's release checks: the Node tests, strict
GSettings schema validation, the package script, ZIP integrity/content checks,
and whitespace validation. The ZIP must include extension source, schema XML,
and artwork while excluding `schemas/gschemas.compiled`.

Documentation or workflow changes needed for the release go through a focused
PR and passing CI. The release tag is created from merged `main`; its tag
workflow must pass and produce the GitHub Release asset. The skill downloads
that asset and verifies its ZIP integrity and digest before any EGO action.

The EGO phase uses the authenticated browser session. It opens the upload form,
attaches the verified GitHub Release ZIP, and records the extension/review URLs
and status. The skill stops for explicit user confirmation immediately before
the final **Upload extension** action.

## Initial listing setup

For a new EGO listing, upload representative public listing media after the
extension submission. A screenshot or the repository's animated WebP demo is
appropriate. Treat listing media as an asset, not a release artifact: retain it
for future versions and replace it only when the visible extension UI materially
changes. The skill requires explicit confirmation immediately before uploading
or replacing public listing media.

## Boundaries and failure handling

The skill does not bypass authentication, CAPTCHAs, browser file-access
restrictions, validation/review failures, or EGO terms. It reports the exact
blocker and leaves the browser form available for resumption when possible.

It does not expose or store account credentials, cookies, or private browser
data. It does not close a GitHub issue or alter unrelated work unless the user
asks.

## Validation

The skill itself is validated with the bundled skill validator. Its installation
is a focused commit that contains only the new skill and this design note.
