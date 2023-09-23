import { WebPlugin } from '@capacitor/core';
import type { HapticsPlugin, ImpactOptions, NotificationOptions, VibrateOptions } from './definitions';
export declare class HapticsWeb extends WebPlugin implements HapticsPlugin {
    selectionStarted: boolean;
    impact(options?: ImpactOptions): Promise<void>;
    notification(options?: NotificationOptions): Promise<void>;
    vibrate(options?: VibrateOptions): Promise<void>;
    selectionStart(): Promise<void>;
    selectionChanged(): Promise<void>;
    selectionEnd(): Promise<void>;
    private patternForImpact;
    private patternForNotification;
    private vibrateWithPattern;
}
