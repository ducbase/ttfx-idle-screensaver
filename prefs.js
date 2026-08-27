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
            description: 'Choose a plain-text art file, or clear it to use the bundled art.',
        });
        page.add(group);
        const enabled = new Adw.SwitchRow({title: 'Enable automatic screensaver'});
        settings.bind('enabled', enabled, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(enabled);
        const delay = new Adw.SpinRow({title: 'Idle delay', subtitle: 'Seconds before starting', adjustment: new Gtk.Adjustment({lower: 1, upper: 3600, step_increment: 30})});
        settings.bind('delay-seconds', delay, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(delay);
        const art = new Adw.ActionRow({title: 'Custom art file'});
        const choose = new Gtk.Button({label: 'Choose'});
        const clear = new Gtk.Button({label: 'Clear'});
        const updateArt = () => {
            const path = settings.get_string('art-path');
            art.subtitle = path || 'Bundled art';
            clear.sensitive = Boolean(path);
        };
        choose.connect('clicked', () => {
            const dialog = new Gtk.FileDialog({title: 'Select art file', modal: true});
            const text = new Gtk.FileFilter({name: 'Text files'});
            text.add_mime_type('text/plain');
            text.add_pattern('*.txt');
            const all = new Gtk.FileFilter({name: 'All files'});
            all.add_pattern('*');
            const filters = Gio.ListStore.new(Gtk.FileFilter);
            filters.append(text);
            filters.append(all);
            dialog.set_filters(filters);
            dialog.set_default_filter(text);
            const current = settings.get_string('art-path');
            if (current)
                dialog.set_initial_file(Gio.File.new_for_path(current));
            dialog.open(window, null, (_source, result) => {
                try {
                    const path = dialog.open_finish(result)?.get_path();
                    if (path)
                        settings.set_string('art-path', path);
                } catch (e) {
                    if (!e.matches(Gtk.DialogError, Gtk.DialogError.DISMISSED))
                        console.error(e);
                }
            });
        });
        clear.connect('clicked', () => settings.set_string('art-path', ''));
        settings.connect('changed::art-path', updateArt);
        updateArt();
        art.add_suffix(clear);
        art.add_suffix(choose);
        art.set_activatable_widget(choose);
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
