import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const controllerSource = await readFile(
    new URL('../idleWatchController.js', import.meta.url),
    'utf8',
);
const {IdleWatchController} = await import(
    `data:text/javascript,${encodeURIComponent(controllerSource)}`,
);

class FakeIdleMonitor {
    constructor() {
        this.nextId = 41;
        this.idleTime = 1250;
        this.added = [];
        this.removed = [];
    }

    add_idle_watch(timeoutMs, callback) {
        const id = this.nextId++;
        this.added.push({id, timeoutMs, callback});
        return id;
    }

    remove_watch(id) {
        this.removed.push(id);
    }

    get_idletime() {
        return this.idleTime;
    }

    fire(index = 0) {
        this.added[index].callback();
    }
}

test('arm owns one watch and is idempotent while armed', () => {
    const monitor = new FakeIdleMonitor();
    const controller = new IdleWatchController(monitor);

    assert.equal(controller.arm(20_000, () => {}), 41);
    assert.equal(controller.arm(30_000, () => {}), 41);
    assert.deepEqual(monitor.added.map(({id, timeoutMs}) => ({id, timeoutMs})), [
        {id: 41, timeoutMs: 20_000},
    ]);
});

test('firing clears ownership before invoking the consumer', () => {
    const monitor = new FakeIdleMonitor();
    const events = [];
    const controller = new IdleWatchController(monitor, (event, details) =>
        events.push({event, details}));
    let observedWatchId = -1;

    controller.arm(20_000, () => {
        observedWatchId = controller.watchId;
    });
    monitor.fire();

    assert.equal(observedWatchId, 0);
    assert.equal(controller.watchId, 0);
    assert.deepEqual(monitor.removed, [41]);
    assert.deepEqual(events.map(({event}) => event), ['armed', 'fired']);
});

test('clear removes the owned watch once and records the reason', () => {
    const monitor = new FakeIdleMonitor();
    const events = [];
    const controller = new IdleWatchController(monitor, (event, details) =>
        events.push({event, details}));

    controller.arm(20_000, () => {});
    controller.clear('settings-changed');
    controller.clear('disable');

    assert.equal(controller.watchId, 0);
    assert.deepEqual(monitor.removed, [41]);
    assert.deepEqual(events.at(-1), {
        event: 'cleared',
        details: {watchId: 41, reason: 'settings-changed'},
    });
});

test('a fired watch can be armed again', () => {
    const monitor = new FakeIdleMonitor();
    const controller = new IdleWatchController(monitor);

    controller.arm(20_000, () => {});
    monitor.fire();
    assert.equal(controller.arm(20_000, () => {}), 42);
    assert.equal(monitor.added.length, 2);
});

test('extension uses event watches without polling or session-mode resets', async () => {
    const source = await readFile(new URL('../extension.js', import.meta.url), 'utf8');

    assert.match(source, /new IdleWatchController\(/);
    assert.match(source, /\.arm\(thresholdMs, \(\) => this\._launch\(false\)\)/);
    assert.doesNotMatch(source, /_startIdlePolling|_idlePollSource|add_seconds/);
    assert.doesNotMatch(source, /Main\.sessionMode\.connect\('updated'/);
});

test('renderer callbacks retain instance ownership across disable and re-enable', async () => {
    const source = await readFile(new URL('../extension.js', import.meta.url), 'utf8');
    const callbackStart = source.indexOf('renderer.wait_async(null, () => {');
    const callbackEnd = source.indexOf('\n        });', callbackStart);
    const callback = source.slice(callbackStart, callbackEnd);

    assert.notEqual(callbackStart, -1, 'renderer exit callback should exist');
    assert.match(source, /const renderer = Gio\.Subprocess\.new\(/,
        'each launch must retain the exact renderer it created');
    assert.match(source, /this\._renderer = renderer;/);
    assert.match(callback, /if \(renderer !== this\._renderer\)\s*return;/,
        'an old exit callback must not mutate a newer renderer lifecycle');
    assert.match(callback, /if \(this\._idleWatchController === null\)\s*return;/);
    assert.ok(
        callback.indexOf('if (renderer !== this._renderer)') <
            callback.indexOf('this._renderer = null;'),
        'only the current renderer may clear renderer ownership',
    );
    assert.ok(
        callback.indexOf('this._renderer = null;') <
            callback.indexOf('if (this._idleWatchController === null)'),
        'a disabled current-renderer exit must clear renderer ownership before returning',
    );
    assert.ok(
        callback.indexOf('this._clearForceStop(renderer);') <
            callback.indexOf('if (this._idleWatchController === null)'),
        'a disabled current-renderer exit must clear its force-stop bookkeeping before returning',
    );
    assert.ok(
        callback.indexOf('if (this._idleWatchController === null)') <
            callback.indexOf('this._clearActiveWatch()'),
        'a disabled extension must return before clearing its nulled active-watch lifecycle',
    );
    assert.ok(
        callback.indexOf('if (this._idleWatchController === null)') < callback.indexOf('this._reset()'),
        'a disabled extension must return before resetting its nulled idle-watch lifecycle',
    );

    const stopStart = source.indexOf('    _stopRenderer() {');
    const stopEnd = source.indexOf('\n    _clearActiveWatch()', stopStart);
    const stopRenderer = source.slice(stopStart, stopEnd);
    assert.match(stopRenderer, /const renderer = this\._renderer;/,
        'force-stop must capture the renderer it is scheduled to stop');
    assert.match(stopRenderer, /renderer\.force_exit\(\);/);
    assert.doesNotMatch(stopRenderer, /this\._renderer\?\.force_exit\(\)/,
        'force-stop must never resolve the renderer from mutable extension state');
    assert.match(stopRenderer, /if \(this\._forceStopSource === forceStopSource &&\s*this\._forceStopRenderer === renderer\)/,
        'only a timeout may clear its own bookkeeping');
    assert.match(callback, /this\._clearForceStop\(renderer\);/,
        'only the exiting renderer may clear its force-stop timeout');
});

test('disable removes the renderer force-stop timeout after requesting shutdown', async () => {
    const source = await readFile(new URL('../extension.js', import.meta.url), 'utf8');
    const disableStart = source.indexOf('    disable() {');
    const disableEnd = source.indexOf('\n    _automaticAllowed()', disableStart);
    const clearForceStopStart = source.indexOf('    _clearForceStop(renderer) {');
    const clearForceStopEnd = source.indexOf('\n    _watchRendererWindow(renderer) {', clearForceStopStart);

    assert.notEqual(disableStart, -1, 'extension disable method should exist');
    assert.notEqual(disableEnd, -1, 'extension disable method end marker should exist');
    assert.notEqual(clearForceStopStart, -1, 'force-stop cleanup helper should exist');
    assert.notEqual(clearForceStopEnd, -1, 'force-stop cleanup helper end marker should exist');

    const disable = source.slice(disableStart, disableEnd);
    const clearForceStop = source.slice(clearForceStopStart, clearForceStopEnd);

    assert.match(disable, /this\._stopRenderer\(\);\s*this\._clearForceStop\(this\._renderer\);/,
        'disable must cancel the force-stop timeout after requesting renderer shutdown');
    assert.match(clearForceStop, /GLib\.Source\.remove\(this\._forceStopSource\);/,
        'force-stop cleanup must remove the GLib main-loop source');
});

test('renderer promotion is PID-scoped and clears its one-shot window listener', async () => {
    const source = await readFile(new URL('../extension.js', import.meta.url), 'utf8');
    const promoteStart = source.indexOf('    _watchRendererWindow(renderer) {');
    const promoteEnd = source.indexOf('\n    _clearRendererWindowWatch(renderer) {', promoteStart);
    const promote = source.slice(promoteStart, promoteEnd);

    assert.notEqual(promoteStart, -1, 'renderer promotion helper should exist');
    assert.match(promote, /Number\.parseInt\(renderer\.get_identifier\(\), 10\)/,
        'promotion must capture the renderer PID while the subprocess is live');
    assert.match(promote, /global\.display\.connect\('window-created'/,
        'promotion must observe the renderer window mapping');
    assert.match(promote, /metaWindow\.get_pid\(\) !== rendererPid/,
        'promotion must only target the renderer process');
    assert.match(promote, /metaWindow\.make_above\(\);/,
        'the matching renderer window must become always-on-top');
    assert.doesNotMatch(promote, /\.activate\(|\.focus\(/,
        'promotion must not disturb user focus');
    assert.match(promote, /this\._clearRendererWindowWatch\(renderer\);/,
        'the listener must be removed after the renderer window maps');
});

test('renderer promotion listener follows renderer lifecycle ownership', async () => {
    const source = await readFile(new URL('../extension.js', import.meta.url), 'utf8');
    const callbackStart = source.indexOf('renderer.wait_async(null, () => {');
    const callbackEnd = source.indexOf('\n        });', callbackStart);
    const callback = source.slice(callbackStart, callbackEnd);
    const stopStart = source.indexOf('    _stopRenderer() {');
    const stopEnd = source.indexOf('\n    _clearForceStop(renderer) {', stopStart);
    const stopRenderer = source.slice(stopStart, stopEnd);
    const clearStart = source.indexOf('    _clearRendererWindowWatch(renderer) {');
    const clearEnd = source.indexOf('\n    _clearActiveWatch()', clearStart);
    const clearRendererWindowWatch = source.slice(clearStart, clearEnd);

    assert.match(source, /this\._watchRendererWindow\(renderer\);/,
        'every renderer launch must register its own promotion listener');
    assert.match(callback, /this\._clearRendererWindowWatch\(renderer\);/,
        'renderer exit must clear its own pending listener');
    assert.match(stopRenderer, /this\._clearRendererWindowWatch\(renderer\);/,
        'renderer stop must clear an unmapped renderer listener');
    assert.match(source, /this\._clearRendererWindowWatch\(this\._renderer\);/,
        'extension disable must clear the current renderer listener');
    assert.match(clearRendererWindowWatch, /this\._rendererWindowCreatedRenderer !== renderer/,
        'an old renderer must not clear a newer renderer listener');
    assert.match(clearRendererWindowWatch, /global\.display\.disconnect\(this\._rendererWindowCreatedId\);/,
        'cleanup must disconnect the display signal');
});
