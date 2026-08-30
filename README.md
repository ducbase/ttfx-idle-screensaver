# ttfx-idle-screensaver
An idle-triggered TTFX screensaver for GNOME Shell on Ubuntu
# TTFX Idle Screensaver

A GNOME Shell 48 extension for Ubuntu that starts a full-screen `ttfx` animation after an idle delay. It is a visual effect, not a lock screen.

![TTFX idle screensaver](docs/screensaver.webp)

## Install

Install `ttfx`, then install **TTFX Idle Screensaver** from [GNOME Extensions](https://extensions.gnome.org/). Enable it in the Extensions app.

Until the GNOME Extensions review is complete, or for manual/development installs, download `ttfx-idle-screensaver@ducbase.com.zip` from [Releases](https://github.com/ducbase/ttfx-idle-screensaver/releases) and run:

```bash
gnome-extensions install --force ttfx-idle-screensaver@ducbase.com.zip
```

Automatic mode requires **Settings → Power → Blank Screen → Never**. This prevents Ubuntu's built-in blanking from covering or competing with the animation. The extension never changes power, idle, or lock settings itself. Preview remains available from preferences.

## How it works

The current `ttfx` release is a command-line renderer and does not expose a D-Bus control interface. The extension starts `renderer.js` as a separate GJS process so it can own the full-screen GTK window while `ttfx` writes the animation into its terminal. GNOME Shell tracks that process for cleanup and keeps the renderer window above other windows; the process receives `SIGTERM` when the animation is dismissed or the extension is disabled.

## Custom art

Generate a plain-text file, then choose it in the extension preferences.

With Omarchy:

```bash
omarchy ascii Ubuntu > ~/screensaver.txt
```

Or ask an agent:

> Write ASCII art of 'Ubuntu' in FIGlet font **Delta Corps Priest 1** to `~/screensaver.txt`.

Open the extension preferences, click **Choose** next to **Custom art file**, and pick that file. Use **Preview** to see it; move the mouse or press any key to dismiss the preview. **Clear** restores the bundled art. This extension reads text only; never point it at a command.

To replace the bundled file instead:

```bash
cp ~/screensaver.txt ~/.local/share/gnome-shell/extensions/ttfx-idle-screensaver@ducbase.com/art/screensaver.txt
```

## Credits

This project is inspired by Omarchy's terminal screensaver. See its [screensaver implementation](https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-screensaver), [branding guide](https://omarchy.org/manual/branding/), and [Delta Corps Priest 1 renderer](https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-ascii). Animation is provided by [ttfx](https://github.com/omacom-io/ttfx), the Rust port of TerminalTextEffects.

## Development

Run `./tools/package.sh` to produce a root-layout extension ZIP in `dist/`. The ZIP intentionally contains schema XML, not `gschemas.compiled`.

Push a `v*` tag to publish that ZIP as a GitHub Release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

For a GNOME Extensions update, upload that release ZIP at [extensions.gnome.org/upload](https://extensions.gnome.org/upload/) with UUID `ttfx-idle-screensaver@ducbase.com`. Upload only the ZIP produced by `./tools/package.sh`: it contains the source schema XML and deliberately omits `schemas/gschemas.compiled`. After the review is approved, the new version becomes available through GNOME Extensions.
