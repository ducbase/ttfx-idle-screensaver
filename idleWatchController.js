export class IdleWatchController {
    constructor(monitor, logger = () => {}) {
        this._monitor = monitor;
        this._logger = logger;
        this._watchId = 0;
    }

    get watchId() {
        return this._watchId;
    }

    arm(timeoutMs, onIdle) {
        if (this._watchId)
            return this._watchId;

        const idleTimeMs = this._monitor.get_idletime();
        this._watchId = this._monitor.add_idle_watch(timeoutMs, () => {
            const watchId = this._watchId;
            this._watchId = 0;
            this._monitor.remove_watch(watchId);
            this._logger('fired', {watchId, timeoutMs, idleTimeMs: this._monitor.get_idletime()});
            onIdle();
        });
        this._logger('armed', {watchId: this._watchId, timeoutMs, idleTimeMs});
        return this._watchId;
    }

    clear(reason = 'reset') {
        if (!this._watchId)
            return;

        const watchId = this._watchId;
        this._watchId = 0;
        this._monitor.remove_watch(watchId);
        this._logger('cleared', {watchId, reason});
    }
}
