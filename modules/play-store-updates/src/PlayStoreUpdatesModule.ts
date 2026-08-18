import { NativeModule, requireOptionalNativeModule } from 'expo';

export type PlayStoreUpdateInfo = {
  updateAvailable: boolean;
  availableVersionCode: number | null;
  stalenessDays: number | null;
  priority: number;
  flexibleAllowed: boolean;
  installStatus: string;
};

export type PlayStoreUpdateResult = {
  status: 'accepted' | 'cancelled' | 'failed' | 'downloaded' | 'unavailable' | 'notAllowed';
};

export type PlayStoreUpdateStatusEvent = {
  status: string;
  bytesDownloaded: number;
  totalBytesToDownload: number;
};

declare class PlayStoreUpdatesModule extends NativeModule {
  getUpdateInfoAsync(): Promise<PlayStoreUpdateInfo>;
  startFlexibleUpdateAsync(): Promise<PlayStoreUpdateResult>;
  completeUpdateAsync(): Promise<boolean>;
}

export default requireOptionalNativeModule<PlayStoreUpdatesModule>('PlayStoreUpdates');
