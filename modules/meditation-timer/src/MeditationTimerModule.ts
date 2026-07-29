import { NativeModule, requireNativeModule } from 'expo';

declare class MeditationTimerModule extends NativeModule {
  scheduleAsync(timestamps: number[]): Promise<void>;
  scheduleTestAsync(): Promise<void>;
  cancelAsync(): Promise<void>;
  canScheduleExactAlarmsAsync(): Promise<boolean>;
}

export default requireNativeModule<MeditationTimerModule>('MeditationTimer');
