import { GoogleAuthService } from './googleAuth';
import { GoogleDriveService } from './googleDrive';
import { DataMergeService } from './dataMergeService';
import { 
  loadSessions, 
  loadUserProgress, 
  loadAppSettings,
  saveAllData,
  clearAllData
} from '../utils/storage';

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
        { ...progress, settings }
      );

      return backupData;
    } catch (error) {
      console.error('Failed to create backup data:', error);
      return null;
    }
  }

  static async uploadBackup() {
    try {
      const isAuthenticated = await GoogleAuthService.isAuthenticated();
      if (!isAuthenticated) {
        throw new Error('Not authenticated with Google');
      }

      const backupData = await this.createFullBackup();
      if (!backupData) {
        throw new Error('Failed to create backup data');
      }

      const result = await GoogleDriveService.uploadBackup(backupData);
      console.log('Upload result:', result);
      return result;
    } catch (error) {
      console.error('Backup upload failed:', error);
      return { success: false, error: error.message };
    }
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
      const preview = DataMergeService.generateMergePreview(localData, backupData.data);

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
      console.log('Safety backup created before merge');

      // Perform smart merge
      const mergeResult = await DataMergeService.performMerge(localData, backupData.data);
      
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
      return result;
    } catch (error) {
      console.error('Google authentication failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async signOutFromGoogle() {
    try {
      await GoogleAuthService.signOut();
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