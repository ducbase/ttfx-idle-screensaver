import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const DEFAULT_DELAY_SECONDS = 600;

export default class TtfxIdleScreensaverExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._sessionSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.session'});
        this._idleMonitor = global.backend.get_core_idle_monitor();
        this._renderer = null;
        this._idlePollSource = 0;
        this._activeWatch = 0;
        this._forceStopSource = 0;
        this._signals = [
            [this._settings, this._settings.connect('changed::enabled', () => this._reset())],
            [this._settings, this._settings.connect('changed::delay-seconds', () => this._reset())],
            [this._settings, this._settings.connect('changed::art-path', () => this._reset())],
            [this._sessionSettings, this._sessionSettings.connect('changed::idle-delay', () => this._reset())],
            [this._settings, this._settings.connect('changed::preview-request', () => this._preview())],
            [this._settings, this._settings.connect('changed::stop-request', () => this._stopRenderer())],
            [Main.sessionMode, Main.sessionMode.connect('updated', () => this._reset())],
        ];
        this._reset();
    }

    disable() {
        this._clearWatches();
        this._stopRenderer();
        for (const [object, id] of this._signals ?? [])
            object.disconnect(id);
        this._signals = null;
        this._settings = null;
        this._sessionSettings = null;
        this._idleMonitor = null;
    }

    _automaticAllowed() {
        return this._settings.get_boolean('enabled') &&
            this._sessionSettings.get_uint('idle-delay') === 0 &&
            GLib.find_program_in_path('ttfx') !== null &&
            GLib.find_program_in_path('gjs') !== null;
    }

    _reset() {
        this._clearIdlePoll();
        if (!this._automaticAllowed()) {
            this._clearActiveWatch();
            this._notifyUnavailable();
            this._stopRenderer();
            return;
        }
        if (this._renderer)
            return;
        this._clearActiveWatch();
        this._startIdlePolling();
    }

    _preview() {
        this._launch(true);
    }

    _launch(preview) {
        if (this._renderer || (!preview && !this._automaticAllowed()))
            return;
        const artPath = this._artPath();
        if (!GLib.file_test(artPath, GLib.FileTest.IS_REGULAR))
            return;
        if (!preview)
            this._clearIdlePoll();
        if (!preview)
            this._activeWatch = this._idleMonitor.add_user_active_watch(() => this._stopRenderer());
        this._renderer = Gio.Subprocess.new(['gjs', '-m', this.dir.get_child('renderer.js').get_path(), artPath], Gio.SubprocessFlags.NONE);
        this._renderer.wait_async(null, () => {
            this._renderer = null;
            this._clearActiveWatch();
            if (this._forceStopSource) {
                GLib.Source.remove(this._forceStopSource);
                this._forceStopSource = 0;
            }
            if (!preview)
                this._reset();
        });
    }

    _artPath() {
        return this._settings.get_string('art-path') || this.dir.get_child('art/screensaver.txt').get_path();
    }

    _notifyUnavailable() {
        const message = GLib.find_program_in_path('ttfx') === null
            ? 'Install ttfx to enable the screensaver.'
            : this._sessionSettings.get_uint('idle-delay') !== 0
                ? 'Set Settings → Power → Blank Screen to Never to enable automatic mode.'
                : null;
        if (message && this._lastNotification !== message) {
            Main.notify('TTFX Idle Screensaver', message);
            this._lastNotification = message;
        }
        if (!message)
            this._lastNotification = null;
    }

    _stopRenderer() {
        if (!this._renderer)
            return;
        this._renderer.send_signal(15);
        if (!this._forceStopSource) {
            this._forceStopSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                this._renderer?.force_exit();
                this._forceStopSource = 0;
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    _startIdlePolling() {
        const thresholdMs = Math.max(1, this._settings.get_uint('delay-seconds') || DEFAULT_DELAY_SECONDS) * 1000;
        const checkIdle = () => {
            if (!this._automaticAllowed()) {
                this._idlePollSource = 0;
                this._reset();
                return GLib.SOURCE_REMOVE;
            }
            if (this._idleMonitor.get_idletime() >= thresholdMs) {
                this._idlePollSource = 0;
                this._launch(false);
                return GLib.SOURCE_REMOVE;
            }
            return GLib.SOURCE_CONTINUE;
        };
        if (checkIdle() === GLib.SOURCE_REMOVE)
            return;
        this._idlePollSource = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, checkIdle);
    }

    _clearIdlePoll() {
        if (this._idlePollSource) GLib.Source.remove(this._idlePollSource);
        this._idlePollSource = 0;
    }
    _clearActiveWatch() {
        if (this._activeWatch) this._idleMonitor.remove_watch(this._activeWatch);
        this._activeWatch = 0;
    }
    _clearWatches() { this._clearIdlePoll(); this._clearActiveWatch(); }
}
