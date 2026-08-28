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
