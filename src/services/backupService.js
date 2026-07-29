import * as Crypto from 'expo-crypto';
import { GoogleAuthService } from './googleAuth';
import { GoogleDriveService } from './googleDrive';
import { DataMergeService } from './dataMergeService';
import { 
  loadSessions, 
  loadUserProgress, 
  loadAppSettings,
  loadBackupState,
  saveBackupState,
  clearBackupState,
  saveAllData
} from '../utils/storage';

const AUTO_BACKUP_INTERVAL_MS = 2 * 24 * 60 * 60 * 1000;
const MAX_BACKUPS = 20;
const BACKUP_FILE_PREFIX = 'meditation-backup-';
const backupStateListeners = new Set();
let backupUploadPromise = null;

const sortForSignature = (value) => {
  if (Array.isArray(value)) {
    return value.map(sortForSignature);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = sortForSignature(value[key]);
        return result;
      }, {});
  }

  return value;
};

const EMPTY_BACKUP_STATE = {
  lastSuccessfulBackupAt: null,
  lastContentSignature: null
};

const notifyBackupStateListeners = (backupState, event = {}) => {
  backupStateListeners.forEach(listener => {
    try {
      listener(backupState, event);
    } catch (error) {
      console.error('Backup state listener failed:', error);
    }
  });
};

export class BackupService {
  static async createFullBackup() {
    try {
      const [sessions, progress, settings] = await Promise.all([
        loadSessions(),
        loadUserProgress(),
        loadAppSettings()
      ]);

      const backupData = await GoogleDriveService.createBackupData(
        sessions,
        progress,
        settings
      );

      return backupData;
    } catch (error) {
      console.error('Failed to create backup data:', error);
      return null;
    }
  }

  static normalizeBackupData(backupData) {
    const data = backupData.data || {};
    const storedProgress = data.progress && typeof data.progress === 'object'
      ? data.progress
      : {};
    const { settings: legacySettings, ...progress } = storedProgress;

    return {
      ...data,
      sessions: Array.isArray(data.sessions) ? data.sessions : [],
      progress,
      settings: data.settings || legacySettings || {},
      timestamp: backupData.timestamp,
      version: backupData.version
    };
  }

  static async createContentSignature(backupData) {
    const normalizedData = this.normalizeBackupData(backupData);
    const signatureData = {
      sessions: normalizedData.sessions,
      progress: normalizedData.progress,
      settings: normalizedData.settings
    };
    const serializedData = JSON.stringify(sortForSignature(signatureData));

    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      serializedData
    );
  }

  static async uploadBackup({ skipIfUnchanged = false } = {}) {
    if (backupUploadPromise) {
      return await backupUploadPromise;
    }

    backupUploadPromise = this.performBackupUpload({ skipIfUnchanged });
    try {
      return await backupUploadPromise;
    } finally {
      backupUploadPromise = null;
    }
  }

  static async performBackupUpload({ skipIfUnchanged = false } = {}) {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Google');
      }

      const backupData = await this.createFullBackup();
      if (!backupData) {
        throw new Error('Failed to create backup data');
      }

      const contentSignature = await this.createContentSignature(backupData);
      const backupState = await loadBackupState();

      if (skipIfUnchanged && backupState.lastContentSignature === contentSignature) {
        return { success: true, skipped: true, reason: 'unchanged' };
      }

      const result = await GoogleDriveService.uploadBackup(backupData);

      if (result.success) {
        const backupCompletedAt = new Date().toISOString();
        const updatedBackupState = {
          lastSuccessfulBackupAt: backupCompletedAt,
          lastContentSignature: contentSignature
        };
        await saveBackupState(updatedBackupState);

        const retentionResult = await this.pruneOldBackups();
        if (!retentionResult.success) {
          console.warn('Backup succeeded, but old backups could not be pruned:', retentionResult.error);
        }

        notifyBackupStateListeners(updatedBackupState, { backupListChanged: true });
      }

      return result;
    } catch (error) {
      console.error('Backup upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async runAutomaticBackup() {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        return { success: true, skipped: true, reason: 'not_authenticated' };
      }

      const backupState = await loadBackupState();
      const lastBackupTime = backupState.lastSuccessfulBackupAt
        ? new Date(backupState.lastSuccessfulBackupAt).getTime()
        : null;

      if (lastBackupTime && Date.now() - lastBackupTime < AUTO_BACKUP_INTERVAL_MS) {
        return { success: true, skipped: true, reason: 'not_due' };
      }

      return await this.uploadBackup({ skipIfUnchanged: true });
    } catch (error) {
      console.error('Automatic backup failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async pruneOldBackups() {
    try {
      const result = await GoogleDriveService.listBackups();
      if (!result.success) {
        throw new Error(result.error);
      }

      const appBackups = (result.files || [])
        .filter(file => file.name.startsWith(BACKUP_FILE_PREFIX))
        .sort((a, b) => new Date(b.createdTime) - new Date(a.createdTime));
      const backupsToDelete = appBackups.slice(MAX_BACKUPS);

      const deleteResults = await Promise.all(
        backupsToDelete.map(backup => GoogleDriveService.deleteBackup(backup.id))
      );
      const failedDelete = deleteResults.find(deleteResult => !deleteResult.success);

      if (failedDelete) {
        throw new Error(failedDelete.error || 'Failed to delete an old backup');
      }

      return { success: true, deletedCount: backupsToDelete.length };
    } catch (error) {
      console.error('Failed to prune old backups:', error);
      return { success: false, error: error.message };
    }
  }

  static async getBackupState() {
    return await loadBackupState();
  }

  static subscribeToBackupState(listener) {
    backupStateListeners.add(listener);
    return () => backupStateListeners.delete(listener);
  }

  static async listBackups() {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Google');
      }

      return await GoogleDriveService.listBackups();
    } catch (error) {
      console.error('Failed to list backups:', error);
      return { success: false, error: error.message };
    }
  }

  static async getRestorePreview(fileId) {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Google');
      }

      // Download backup data
      const downloadResult = await GoogleDriveService.downloadBackup(fileId);
      if (!downloadResult.success) {
        throw new Error(downloadResult.error);
      }

      const backupData = downloadResult.data;
      
      // Validate backup data structure
      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data format');
      }

      // Load current local data
      const [sessions, progress, settings] = await Promise.all([
        loadSessions(),
        loadUserProgress(),
        loadAppSettings()
      ]);

      const localData = { sessions, progress, settings };

      // Generate merge preview
      const normalizedBackupData = this.normalizeBackupData(backupData);
      const preview = DataMergeService.generateMergePreview(localData, normalizedBackupData);

      return { success: true, preview };
    } catch (error) {
      console.error('Preview generation failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async mergeFromBackup(fileId) {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Google');
      }

      // Download backup data
      const downloadResult = await GoogleDriveService.downloadBackup(fileId);
      if (!downloadResult.success) {
        throw new Error(downloadResult.error);
      }

      const backupData = downloadResult.data;
      
      // Validate backup data structure
      if (!this.validateBackupData(backupData)) {
        throw new Error('Invalid backup data format');
      }

      // Load current local data
      const [sessions, progress, settings] = await Promise.all([
        loadSessions(),
        loadUserProgress(),
        loadAppSettings()
      ]);

      const localData = { sessions, progress, settings };

      // Create safety backup first
      const safetyBackup = await this.createFullBackup();

      // Perform smart merge
      const normalizedBackupData = this.normalizeBackupData(backupData);
      const mergeResult = await DataMergeService.performMerge(localData, normalizedBackupData);
      
      if (!mergeResult.success) {
        throw new Error(mergeResult.error);
      }

      // Save merged data
      await saveAllData(mergeResult.data);

      return { 
        success: true, 
        message: 'Backup merged successfully',
        summary: mergeResult.summary,
        safetyBackup
      };
    } catch (error) {
      console.error('Backup merge failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Legacy method - kept for compatibility but now uses merge
  static async restoreFromBackup(fileId) {
    const result = await this.mergeFromBackup(fileId);
    if (result.success) {
      return { success: true, message: result.message };
    }
    return result;
  }

  static validateBackupData(backupData) {
    if (!backupData || typeof backupData !== 'object') {
      return false;
    }

    if (!backupData.data || typeof backupData.data !== 'object') {
      return false;
    }

    const requiredFields = ['version', 'timestamp', 'app'];
    for (const field of requiredFields) {
      if (!(field in backupData)) {
        return false;
      }
    }

    return backupData.app === 'meditation-tracker';
  }

  static async authenticateWithGoogle() {
    try {
      const result = await GoogleAuthService.authenticate();
      if (result.success) {
        await clearBackupState();
        notifyBackupStateListeners(EMPTY_BACKUP_STATE);
      }
      return result;
    } catch (error) {
      console.error('Google authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async signOutFromGoogle() {
    try {
      const signedOut = await GoogleAuthService.signOut();
      if (!signedOut) {
        throw new Error('Google sign out failed');
      }

      await clearBackupState();
      notifyBackupStateListeners(EMPTY_BACKUP_STATE);
      return { success: true };
    } catch (error) {
      console.error('Google sign out failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async isGoogleAuthenticated() {
    return await GoogleAuthService.isAuthenticated();
  }

  static async deleteBackup(fileId) {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Google');
      }

      return await GoogleDriveService.deleteBackup(fileId);
    } catch (error) {
      console.error('Failed to delete backup:', error);
      return { success: false, error: error.message };
    }
  }
}
