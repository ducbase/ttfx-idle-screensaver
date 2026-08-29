import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('preferences expose one self-dismissing preview control', async () => {
    const prefs = await readFile(new URL('../prefs.js', import.meta.url), 'utf8');
    const extension = await readFile(new URL('../extension.js', import.meta.url), 'utf8');
    const schema = await readFile(
        new URL('../schemas/org.gnome.shell.extensions.ttfx-idle-screensaver.gschema.xml', import.meta.url),
        'utf8',
    );

    assert.match(prefs, /new Adw\.ActionRow\(\{title: 'Preview', subtitle: 'Move the mouse or press any key to stop'\}\)/);
    assert.match(prefs, /new Gtk\.Button\(\{label: 'Start'\}\)/);
    assert.doesNotMatch(prefs, /Stop preview|stop-request/);
    assert.doesNotMatch(extension, /stop-request/);
    assert.doesNotMatch(schema, /name="stop-request"/);
});
