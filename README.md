# ttfx-idle-screensaver
An idle-triggered TTFX screensaver for GNOME Shell on Ubuntu
# TTFX Idle Screensaver

A GNOME Shell 48 extension for Ubuntu that starts a full-screen `ttfx` animation after an idle delay. It is a visual effect, not a lock screen.

![TTFX idle screensaver](docs/screensaver.webp)

## Install

Install `ttfx`, then download `ttfx-idle-screensaver@ducbase.com.zip` from [Releases](https://github.com/ducbase/ttfx-idle-screensaver/releases) and run:

```bash
gnome-extensions install --force ttfx-idle-screensaver@ducbase.com.zip
```

Enable it in the Extensions app. Automatic mode requires **Settings → Power → Blank Screen → Never**. This prevents Ubuntu's built-in blanking from covering or competing with the animation. The extension never changes power, idle, or lock settings itself. Preview remains available from preferences.

## Custom art

Generate a plain-text file, then choose it in the extension preferences.

```bash
omarchy ascii Ubuntu > ~/screensaver.txt
```

Open the extension preferences, click **Choose** next to **Custom art file**, and pick that file. Use **Preview** to see it. **Clear** restores the bundled art. This extension reads text only; never point it at a command.

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
