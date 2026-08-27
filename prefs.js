import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk?version=4.0';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class TtfxIdleScreensaverPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        const group = new Adw.PreferencesGroup({
            title: 'Screensaver',
            description: 'Custom art file is an absolute path to a plain-text file. Leave it empty to use the bundled art.',
        });
        page.add(group);
        const enabled = new Adw.SwitchRow({title: 'Enable automatic screensaver'});
        settings.bind('enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(enabled);
        const delay = new Adw.SpinRow({title: 'Idle delay', subtitle: 'Seconds before starting', adjustment: new Gtk.Adjustment({lower: 1, upper: 3600, step_increment: 30})});
        settings.bind('delay-seconds', delay, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(delay);
        const art = new Adw.EntryRow({title: 'Custom art file'});
        settings.bind('art-path', art, 'text', Gio.SettingsBindFlags.DEFAULT);
        group.add(art);
        const preview = new Adw.ActionRow({title: 'Preview'});
        const previewButton = new Gtk.Button({label: 'Start'});
        previewButton.connect('clicked', () => settings.set_uint('preview-request', settings.get_uint('preview-request') + 1));
        preview.add_suffix(previewButton);
        group.add(preview);
        const stop = new Adw.ActionRow({title: 'Stop preview'});
        const stopButton = new Gtk.Button({label: 'Stop'});
        stopButton.connect('clicked', () => settings.set_uint('stop-request', settings.get_uint('stop-request') + 1));
        stop.add_suffix(stopButton);
        group.add(stop);
        const note = new Adw.PreferencesGroup({description: 'Automatic mode is intentionally inactive until Settings → Power → Blank Screen is set to Never. This extension does not change Ubuntu power or lock settings.'});
        page.add(note);
        window.add(page);
    }
}
