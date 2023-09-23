var capacitorHaptics = (function (exports, core) {
    'use strict';

    exports.ImpactStyle = void 0;
    (function (ImpactStyle) {
        /**
         * A collision between large, heavy user interface elements
         *
         * @since 1.0.0
         */
        ImpactStyle["Heavy"] = "HEAVY";
        /**
         * A collision between moderately sized user interface elements
         *
         * @since 1.0.0
         */
        ImpactStyle["Medium"] = "MEDIUM";
        /**
         * A collision between small, light user interface elements
         *
         * @since 1.0.0
         */
        ImpactStyle["Light"] = "LIGHT";
    })(exports.ImpactStyle || (exports.ImpactStyle = {}));
    exports.NotificationType = void 0;
    (function (NotificationType) {
        /**
         * A notification feedback type indicating that a task has completed successfully
         *
         * @since 1.0.0
         */
        NotificationType["Success"] = "SUCCESS";
        /**
         * A notification feedback type indicating that a task has produced a warning
         *
         * @since 1.0.0
         */
        NotificationType["Warning"] = "WARNING";
        /**
         * A notification feedback type indicating that a task has failed
         *
         * @since 1.0.0
         */
        NotificationType["Error"] = "ERROR";
    })(exports.NotificationType || (exports.NotificationType = {}));
    /**
     * @deprecated Use `NotificationType`.
     * @since 1.0.0
     */
    const HapticsNotificationType = exports.NotificationType;
    /**
     * @deprecated Use `ImpactStyle`.
     * @since 1.0.0
     */
    const HapticsImpactStyle = exports.ImpactStyle;

    const Haptics = core.registerPlugin('Haptics', {
        web: () => Promise.resolve().then(function () { return web; }).then(m => new m.HapticsWeb()),
    });

    class HapticsWeb extends core.WebPlugin {
        constructor() {
            super(...arguments);
            this.selectionStarted = false;
        }
        async impact(options) {
            const pattern = this.patternForImpact(options === null || options === void 0 ? void 0 : options.style);
            this.vibrateWithPattern(pattern);
        }
        async notification(options) {
            const pattern = this.patternForNotification(options === null || options === void 0 ? void 0 : options.type);
            this.vibrateWithPattern(pattern);
        }
        async vibrate(options) {
            const duration = (options === null || options === void 0 ? void 0 : options.duration) || 300;
            this.vibrateWithPattern([duration]);
        }
        async selectionStart() {
            this.selectionStarted = true;
        }
        async selectionChanged() {
            if (this.selectionStarted) {
                this.vibrateWithPattern([70]);
            }
        }
        async selectionEnd() {
            this.selectionStarted = false;
        }
        patternForImpact(style = exports.ImpactStyle.Heavy) {
            if (style === exports.ImpactStyle.Medium) {
                return [43];
            }
            else if (style === exports.ImpactStyle.Light) {
                return [20];
            }
            return [61];
        }
        patternForNotification(type = exports.NotificationType.Success) {
            if (type === exports.NotificationType.Warning) {
                return [30, 40, 30, 50, 60];
            }
            else if (type === exports.NotificationType.Error) {
                return [27, 45, 50];
            }
            return [35, 65, 21];
        }
        vibrateWithPattern(pattern) {
            if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
            else {
                throw this.unavailable('Browser does not support the vibrate API');
            }
        }
    }

    var web = /*#__PURE__*/Object.freeze({
        __proto__: null,
        HapticsWeb: HapticsWeb
    });

    exports.Haptics = Haptics;
    exports.HapticsImpactStyle = HapticsImpactStyle;
    exports.HapticsNotificationType = HapticsNotificationType;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({}, capacitorExports);
//# sourceMappingURL=plugin.js.map
