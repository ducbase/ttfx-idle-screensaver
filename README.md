# ttfx-idle-screensaver
An idle-triggered TTFX screensaver for GNOME Shell on Ubuntu
# TTFX Idle Screensaver

A GNOME Shell 48 extension for Ubuntu that starts a full-screen `ttfx` animation after an idle delay. It is a visual effect, not a lock screen.

## Install

Install `ttfx`, then download the ZIP from the GitHub Actions artifact and run:

```bash
gnome-extensions install --force ttfx-idle-screensaver@ducbase.com.zip
```

Enable it in the Extensions app. Automatic mode requires **Settings → Power → Blank Screen → Never**. This prevents Ubuntu's built-in blanking from covering or competing with the animation. The extension never changes power, idle, or lock settings itself. Preview remains available from preferences.

## Custom art

The default `art/screensaver.txt` spells Ubuntu in **Delta Corps Priest 1**, the FIGlet font used by Omarchy. Set **Custom art file** in the extension preferences to a readable plain-text file, or edit the bundled file. Never point it at a command: this extension reads text only.

You can also ask an agent to update the file. For example:

> Update the `art/screensaver.txt` file with the text 'Omarchy' in ASCII font **Delta Corps Priest 1** (a FIGlet font).

To generate comparable art with Omarchy installed:

```bash
omarchy ascii Ubuntu > art/screensaver.txt
```

## Credits

This project is inspired by Omarchy's terminal screensaver. See its [screensaver implementation](https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-screensaver), [branding guide](https://omarchy.org/manual/branding/), and [Delta Corps Priest 1 renderer](https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-ascii). Animation is provided by [ttfx](https://github.com/omacom-io/ttfx), the Rust port of TerminalTextEffects.

## Development

Run `./tools/package.sh` to produce a root-layout extension ZIP in `dist/`. The ZIP intentionally contains schema XML, not `gschemas.compiled`.
