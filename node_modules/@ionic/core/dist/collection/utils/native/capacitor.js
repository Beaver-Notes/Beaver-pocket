/*!
 * (C) Ionic http://ionicframework.com - MIT License
 */
import { win } from "../browser/index";
export const getCapacitor = () => {
  if (win !== undefined) {
    return win.Capacitor;
  }
  return undefined;
};
