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

The bundled default is `art/screensaver.txt`. It spells Ubuntu in **Delta Corps Priest 1**, the FIGlet font used by Omarchy. This extension reads plain text only. Never point it at a command.

**Persistent override (recommended).** Set **Custom art file** in the extension preferences to an **absolute** path of a readable text file, for example `/home/you/.config/ttfx-idle-screensaver/screensaver.txt`. That setting survives extension reinstalls. Relative paths are resolved against GNOME Shell's working directory, not this repository and not your home directory, so they are not reliable.

A per-user file under your home directory is the right place for custom art. Do not put it in `/etc`: this is a user-session GNOME Shell extension, not a system service. Do not treat the installed extension directory as a config location either; `gnome-extensions install --force` overwrites it.

**Repository checkout.** Editing `art/screensaver.txt` here only becomes the installed default after you rebuild and reinstall:

```bash
./tools/package.sh
gnome-extensions install --force dist/ttfx-idle-screensaver@ducbase.com.zip
```

Then stop and restart the animation, or wait for the next idle launch. An already-running renderer does not reload the file.

**Installed bundled file.** Editing `~/.local/share/gnome-shell/extensions/ttfx-idle-screensaver@ducbase.com/art/screensaver.txt` affects the next renderer launch only. A later reinstall overwrites it. Prefer **Custom art file**.

You can also ask an agent. For a repository/default change:

> Update `art/screensaver.txt` with the text 'Omarchy' in ASCII font **Delta Corps Priest 1** (a FIGlet font). Rebuild and reinstall the extension ZIP so the bundled default updates.

For a persistent user override:

> Write the art to `/home/YOU/.config/ttfx-idle-screensaver/screensaver.txt` and set **Custom art file** in the extension preferences to that absolute path.

To generate comparable art with Omarchy installed:

```bash
omarchy ascii Ubuntu > art/screensaver.txt
```

## Credits

This project is inspired by Omarchy's terminal screensaver. See its [screensaver implementation](https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-screensaver), [branding guide](https://omarchy.org/manual/branding/), and [Delta Corps Priest 1 renderer](https://github.com/basecamp/omarchy/blob/quattro/bin/omarchy-ascii). Animation is provided by [ttfx](https://github.com/omacom-io/ttfx), the Rust port of TerminalTextEffects.

## Development

Run `./tools/package.sh` to produce a root-layout extension ZIP in `dist/`. The ZIP intentionally contains schema XML, not `gschemas.compiled`.
