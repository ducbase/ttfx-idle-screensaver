import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

test('renderer hides the pointer with an overlay EventBox and dismisses on motion or key press', async () => {
    const source = await readFile(new URL('../renderer.js', import.meta.url), 'utf8');

    assert.match(source, /const overlay = new Gtk\.Overlay\(\);/);
    assert.match(
        source,
        /const inputLayer = new Gtk\.EventBox\(\{[\s\S]*above_child:\s*true,[\s\S]*visible_window:\s*true,[\s\S]*app_paintable:\s*true,[\s\S]*can_focus:\s*false,[\s\S]*halign:\s*Gtk\.Align\.FILL,[\s\S]*valign:\s*Gtk\.Align\.FILL,[\s\S]*hexpand:\s*true,[\s\S]*vexpand:\s*true,[\s\S]*\}\);/,
        'the EventBox must be a windowed, above-child, app-paintable, non-focusable fill overlay',
    );
    assert.match(source, /overlay\.add\(terminal\);/);
    assert.match(source, /overlay\.add_overlay\(inputLayer\);/);
    assert.match(source, /window\.add\(overlay\);/);
    assert.doesNotMatch(
        source,
        /inputLayer\.add\(terminal\)|window\.add\(terminal\)/,
        'the EventBox must be an empty overlay sibling, not a wrapper around the terminal',
    );

    assert.match(
        source,
        /inputLayer\.connect\('draw',\s*\(\)\s*=>\s*true\);/,
        'EventBox drawing must be suppressed so the terminal remains visible',
    );
    assert.doesNotMatch(
        source,
        /Cairo|cairo|OPERATOR_CLEAR|set_opacity/,
        'transparency must not use Cairo CLEAR or widget opacity',
    );

    assert.match(
        source,
        /inputLayer\.add_events\(Gdk\.EventMask\.POINTER_MOTION_MASK\);/,
        'the overlay EventBox must receive pointer motion',
    );
    assert.match(
        source,
        /inputLayer\.connect\('motion-notify-event',\s*\(\)\s*=>\s*\{\s*stop\(\);\s*return true;\s*\}\);/,
        'pointer motion on the EventBox must stop the renderer',
    );
    assert.match(
        source,
        /terminal\.add_events\(Gdk\.EventMask\.KEY_PRESS_MASK\);/,
        'the terminal must still receive key events',
    );
    assert.match(
        source,
        /terminal\.connect\('key-press-event',\s*\(\)\s*=>\s*\{\s*stop\(\);\s*return true;\s*\}\);/,
        'key press on the terminal must stop the renderer',
    );
    assert.doesNotMatch(
        source,
        /terminal\.add_events\([^)]*POINTER_MOTION_MASK/,
        'pointer motion must not be selected on the terminal',
    );
    assert.doesNotMatch(
        source,
        /terminal\.connect\('motion-notify-event'/,
        'pointer dismissal must not remain on the terminal',
    );

    const showAllAt = source.indexOf('window.show_all()');
    assert.ok(showAllAt > 0, 'the renderer must still show its window');
    assert.ok(
        source.indexOf('terminal.grab_focus()') > showAllAt,
        'the terminal must be focused after show_all() so key dismissal remains reliable',
    );

    assert.match(source, /^let blankCursor;/m, 'one module-level blankCursor must be reused');
    assert.match(
        source,
        /Gdk\.Cursor\.new_for_display\([^,]+,\s*Gdk\.CursorType\.BLANK_CURSOR\)/,
    );
    assert.match(
        source,
        /inputLayer\.connect\('realize',\s*\(\)\s*=>\s*blankPointerOn\(inputLayer\)\);/,
        'realize must blank the EventBox Gdk window',
    );
    assert.match(
        source,
        /window\.connect\('realize',\s*\(\)\s*=>\s*blankPointerOn\(window\)\);/,
        'realize must also blank the toplevel Gdk window',
    );
    assert.doesNotMatch(
        source,
        /get_children|applyBlankCursor|hideRendererPointer|enter-notify-event/,
        'must not recurse VTE child windows or reapply the cursor on enter-notify',
    );

    const stopBody = source.match(/function stop\(\) \{([\s\S]*?)\n\}/);
    assert.ok(stopBody, 'stop() must remain the dismissal path');
    assert.doesNotMatch(
        stopBody[1],
        /set_cursor|blankCursor|BLANK_CURSOR/,
        'stop() must not unset the cursor; destroying renderer windows restores the pointer',
    );
});
