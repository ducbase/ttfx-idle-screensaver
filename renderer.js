#!/usr/bin/env -S gjs -m

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GLibUnix from 'gi://GLibUnix';
import Gdk from 'gi://Gdk?version=3.0';
import Gtk from 'gi://Gtk?version=3.0';
import Vte from 'gi://Vte?version=2.91';

const artPath = ARGV[0];
if (!artPath)
    throw new Error('Expected an art file path');

let stopping = false;
let terminal;
let window;
let blankCursor;
const app = new Gtk.Application({
    application_id: 'com.github.ducbase.TtfxIdleScreensaver',
    flags: Gio.ApplicationFlags.NON_UNIQUE,
});

function stop() {
    if (stopping)
        return;
    stopping = true;
    terminal?.feed_child('\x03');
    window?.close();
    app.quit();
}

function blankPointerOn(widget) {
    const gdkWindow = widget?.get_window();
    if (!gdkWindow)
        return;
    if (!blankCursor)
        blankCursor = Gdk.Cursor.new_for_display(gdkWindow.get_display(), Gdk.CursorType.BLANK_CURSOR);
    gdkWindow.set_cursor(blankCursor);
}

function runEffect() {
    if (stopping)
        return;
    terminal.spawn_async(
        Vte.PtyFlags.DEFAULT,
        null,
        ['ttfx', '-i', artPath, '--frame-rate', '60', '--canvas-width', '0', '--canvas-height', '0', '--reuse-canvas', '--anchor-canvas', 'c', '--anchor-text', 'c', '--random-effect', '--no-eol', '--no-restore-cursor'],
        null,
        GLib.SpawnFlags.SEARCH_PATH,
        null,
        -1,
        null,
        () => {},
    );
}

app.connect('activate', () => {
    window = new Gtk.ApplicationWindow({application: app, decorated: false});
    window.set_default_size(1280, 720);
    window.fullscreen();
    terminal = new Vte.Terminal({
        cursor_blink_mode: Vte.CursorBlinkMode.OFF,
        cursor_shape: Vte.CursorShape.BLOCK,
        scroll_on_output: false,
    });
    terminal.add_events(Gdk.EventMask.KEY_PRESS_MASK);
    terminal.set_color_background(new Gdk.RGBA({red: 0, green: 0, blue: 0, alpha: 1}));
    terminal.connect('child-exited', () => {
        if (!stopping)
            runEffect();
    });
    terminal.connect('key-press-event', () => {
        stop();
        return true;
    });
    const overlay = new Gtk.Overlay();
    const inputLayer = new Gtk.EventBox({
        above_child: true,
        visible_window: true,
        app_paintable: true,
        can_focus: false,
        halign: Gtk.Align.FILL,
        valign: Gtk.Align.FILL,
        hexpand: true,
        vexpand: true,
    });
    inputLayer.add_events(Gdk.EventMask.POINTER_MOTION_MASK);
    inputLayer.connect('draw', () => true);
    inputLayer.connect('motion-notify-event', () => {
        stop();
        return true;
    });
    inputLayer.connect('realize', () => blankPointerOn(inputLayer));
    overlay.add(terminal);
    overlay.add_overlay(inputLayer);
    window.add(overlay);
    window.connect('delete-event', () => {
        stop();
        return false;
    });
    window.connect('realize', () => blankPointerOn(window));
    window.show_all();
    terminal.grab_focus();
    runEffect();
});

GLibUnix.signal_add_full(GLib.PRIORITY_DEFAULT, 15, () => {
    stop();
    return GLib.SOURCE_REMOVE;
});

app.run([]);
