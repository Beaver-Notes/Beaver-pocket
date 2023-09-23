/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { getCapacitor } from "./capacitor";
export var Style;
(function (Style) {
  Style["Dark"] = "DARK";
  Style["Light"] = "LIGHT";
  Style["Default"] = "DEFAULT";
})(Style || (Style = {}));
export const StatusBar = {
  getEngine() {
    const capacitor = getCapacitor();
    if (capacitor === null || capacitor === void 0 ? void 0 : capacitor.isPluginAvailable('StatusBar')) {
      return capacitor.Plugins.StatusBar;
    }
    return undefined;
  },
  // TODO FW-4696 Remove supportDefaultStatusBarStyle in Ionic v8
  supportsDefaultStatusBarStyle() {
    const capacitor = getCapacitor();
    /**
     * The 'DEFAULT' status bar style was added
     * to the @capacitor/status-bar plugin in Capacitor 3.
     * PluginHeaders is only supported in Capacitor 3+,
     * so we can use this to detect Capacitor 3.
     */
    return !!(capacitor === null || capacitor === void 0 ? void 0 : capacitor.PluginHeaders);
  },
  setStyle(options) {
    const engine = this.getEngine();
    if (!engine) {
      return;
    }
    engine.setStyle(options);
  },
  getStyle: async function () {
    const engine = this.getEngine();
    if (!engine) {
      return Style.Default;
    }
    const { style } = await engine.getInfo();
    return style;
  },
};
