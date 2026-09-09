import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('renderer hides the pointer and dismisses only on motion or key press', async () => {
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

    assert.match(
        source,
        /^let blankCursor;/m,
        'one module-level blankCursor must be reused across hide calls',
    );
    assert.match(
        source,
        /Gdk\.Cursor\.new_for_display\([^,]+,\s*Gdk\.CursorType\.BLANK_CURSOR\)/,
        'the blank cursor must be created for the toplevel Gdk window display',
    );
    assert.match(
        source,
        /function hideRendererPointer\(\) \{[\s\S]*window\?\.get_window\(\)/,
        'hideRendererPointer must start from the renderer toplevel Gdk.Window',
    );
    assert.match(
        source,
        /set_cursor\(blankCursor\);[\s\S]*get_children\?\.\(\)/,
        'the blank cursor must be applied recursively through Gdk.Window.get_children()',
    );
    assert.match(
        source,
        /for \(const child of children\)\s*applyBlankCursor\(child\)/,
        'child Gdk windows must be walked recursively, not targeted as widget windows',
    );
    assert.equal(
        source.match(/get_window\(\)\s*\??\s*\.\s*set_cursor/g),
        null,
        'duplicate widget.get_window().set_cursor calls are not a Gdk child-window walk',
    );

    const showAllAt = source.indexOf('window.show_all()');
    assert.ok(showAllAt > 0, 'the renderer must still show its window');
    for (const hook of [
        "window.connect('realize', hideRendererPointer)",
        "terminal.connect('realize', hideRendererPointer)",
        "terminal.connect_after('enter-notify-event'",
    ]) {
        const at = source.indexOf(hook);
        assert.ok(at !== -1 && at < showAllAt, `${hook} must be connected before show_all()`);
    }

    const enterHandler = source.match(
        /terminal\.connect_after\('enter-notify-event',\s*\(\)\s*=>\s*\{([\s\S]*?)\}\);/,
    );
    assert.ok(enterHandler, 'enter-notify-event must use connect_after so it runs after VTE');
    assert.match(
        enterHandler[1],
        /hideRendererPointer\(\);\s*return false;/,
        'enter-notify must reapply the blank cursor and must not consume the event',
    );
    assert.doesNotMatch(
        enterHandler[1],
        /\bstop\s*\(/,
        'enter-notify must not dismiss the renderer',
    );

    const stopBody = source.match(/function stop\(\) \{([\s\S]*?)\n\}/);
    assert.ok(stopBody, 'stop() must remain the dismissal path');
    assert.doesNotMatch(
        stopBody[1],
        /set_cursor|blankCursor|BLANK_CURSOR/,
        'stop() must not unset the cursor; destroying renderer windows restores the pointer',
    );
});
