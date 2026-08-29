import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('renderer dismisses its fullscreen window on pointer motion or key press', async () => {
    const source = await readFile(new URL('../renderer.js', import.meta.url), 'utf8');

    assert.match(
        source,
        /terminal\.add_events\(Gdk\.EventMask\.POINTER_MOTION_MASK \| Gdk\.EventMask\.KEY_PRESS_MASK\);/,
        'the terminal that receives input must request pointer and key events',
    );
    for (const signal of ['motion-notify-event', 'key-press-event']) {
        assert.match(
            source,
            new RegExp(`terminal\\.connect\\('${signal}', \\(\\) => \\{\\s*stop\\(\\);\\s*return true;\\s*\\}\\);`),
            `${signal} must stop the renderer and consume the event`,
        );
    }
});
