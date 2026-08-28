import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {IdleWatchController} from './idleWatchController.js';

const DEFAULT_DELAY_SECONDS = 600;

export default class TtfxIdleScreensaverExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._sessionSettings = new Gio.Settings({schema_id: 'org.gnome.desktop.session'});
        this._idleMonitor = global.backend.get_core_idle_monitor();
        this._renderer = null;
        this._idleWatchController = new IdleWatchController(
            this._idleMonitor,
            (event, details) => this._logIdleWatch(event, details),
        );
        this._activeWatch = 0;
        this._forceStopSource = 0;
        this._forceStopRenderer = null;
        this._rendererWindowCreatedId = 0;
        this._rendererWindowCreatedRenderer = null;
        this._signals = [
            [this._settings, this._settings.connect('changed::enabled', () => this._reset())],
            [this._settings, this._settings.connect('changed::delay-seconds', () => this._reset())],
            [this._settings, this._settings.connect('changed::art-path', () => this._reset())],
            [this._sessionSettings, this._sessionSettings.connect('changed::idle-delay', () => this._reset())],
            [this._settings, this._settings.connect('changed::preview-request', () => this._preview())],
            [this._settings, this._settings.connect('changed::stop-request', () => this._stopRenderer())],
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
        this._idleWatchController = null;
        this._idleMonitor = null;
    }

    _automaticAllowed() {
        return this._settings.get_boolean('enabled') &&
            this._sessionSettings.get_uint('idle-delay') === 0 &&
            GLib.find_program_in_path('ttfx') !== null &&
            GLib.find_program_in_path('gjs') !== null;
    }

    _reset() {
        this._idleWatchController.clear('reset');
        if (!this._automaticAllowed()) {
            this._clearActiveWatch();
            this._notifyUnavailable();
            this._stopRenderer();
            return;
        }
        if (this._renderer)
            return;
        this._clearActiveWatch();
        this._armIdleWatch();
    }

    _armIdleWatch() {
        const thresholdMs = Math.max(
            1,
            this._settings.get_uint('delay-seconds') || DEFAULT_DELAY_SECONDS,
        ) * 1000;
        this._idleWatchController.arm(thresholdMs, () => this._launch(false));
    }

    _logIdleWatch(event, details) {
        console.log(`[${this.uuid}] idle-watch ${event}: ${JSON.stringify(details)}`);
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
        if (!preview) {
            this._idleWatchController.clear('launch');
            this._activeWatch = this._idleMonitor.add_user_active_watch(() => {
                this._activeWatch = 0;
                this._stopRenderer();
            });
        }
        const renderer = Gio.Subprocess.new(['gjs', '-m', this.dir.get_child('renderer.js').get_path(), artPath], Gio.SubprocessFlags.NONE);
        this._renderer = renderer;
        this._watchRendererWindow(renderer);
        renderer.wait_async(null, () => {
            if (renderer !== this._renderer)
                return;
            this._clearRendererWindowWatch(renderer);
            this._renderer = null;
            this._clearForceStop(renderer);
            if (this._idleWatchController === null)
                return;
            this._clearActiveWatch();
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
        const renderer = this._renderer;
        if (!renderer)
            return;
        this._clearRendererWindowWatch(renderer);
        renderer.send_signal(15);
        if (!this._forceStopSource) {
            let forceStopSource = 0;
            forceStopSource = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1500, () => {
                renderer.force_exit();
                if (this._forceStopSource === forceStopSource &&
                    this._forceStopRenderer === renderer) {
                    this._forceStopSource = 0;
                    this._forceStopRenderer = null;
                }
                return GLib.SOURCE_REMOVE;
            });
            this._forceStopSource = forceStopSource;
            this._forceStopRenderer = renderer;
        }
    }

    _clearForceStop(renderer) {
        if (this._forceStopRenderer !== renderer)
            return;
        if (this._forceStopSource)
            GLib.Source.remove(this._forceStopSource);
        this._forceStopSource = 0;
        this._forceStopRenderer = null;
    }

    _watchRendererWindow(renderer) {
        const rendererPid = Number.parseInt(renderer.get_identifier(), 10);
        if (!Number.isSafeInteger(rendererPid) || rendererPid <= 0)
            return;
        this._rendererWindowCreatedRenderer = renderer;
        this._rendererWindowCreatedId = global.display.connect('window-created', (_display, metaWindow) => {
            if (renderer !== this._renderer || metaWindow.get_pid() !== rendererPid)
                return;
            metaWindow.make_above();
            this._clearRendererWindowWatch(renderer);
        });
    }

    _clearRendererWindowWatch(renderer) {
        if (this._rendererWindowCreatedRenderer !== renderer)
            return;
        if (this._rendererWindowCreatedId)
            global.display.disconnect(this._rendererWindowCreatedId);
        this._rendererWindowCreatedId = 0;
        this._rendererWindowCreatedRenderer = null;
    }

    _clearActiveWatch() {
        if (this._activeWatch) this._idleMonitor.remove_watch(this._activeWatch);
        this._activeWatch = 0;
    }
    _clearWatches() {
        this._idleWatchController?.clear('disable');
        this._clearActiveWatch();
        this._clearRendererWindowWatch(this._renderer);
    }
}
