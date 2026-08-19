import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class MeditationWidgetModule extends NativeModule {
  isAddedAsync(): Promise<boolean>;
  wasEverAddedAsync(): Promise<boolean>;
  canRequestPinAsync(): Promise<boolean>;
  requestPinAsync(): Promise<boolean>;
  updateAsync(
    currentStreak: number,
    quotes: string[],
    morningCompleted: boolean,
    eveningCompleted: boolean,
    theme: 'light' | 'dark' | 'auto',
    snapshotDate: string,
    streakValidThrough: string,
    language: 'english' | 'hindi',
  ): Promise<void>;
}

export default requireOptionalNativeModule<MeditationWidgetModule>('MeditationWidget');
