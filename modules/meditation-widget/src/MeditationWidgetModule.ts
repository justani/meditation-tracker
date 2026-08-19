import { NativeModule, requireOptionalNativeModule } from 'expo';

declare class MeditationWidgetModule extends NativeModule {
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
