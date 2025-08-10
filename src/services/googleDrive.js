import { GoogleAuthService } from './googleAuth';

export class GoogleDriveService {
  static async uploadBackup(backupData) {
    try {
      const accessToken = await GoogleAuthService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const fileName = `meditation-backup-${new Date().toISOString().split('T')[0]}.json`;
      const fileContent = JSON.stringify(backupData, null, 2);

      const metadata = {
        name: fileName,
        parents: ['appDataFolder'],
        description: 'Meditation Tracker backup file',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      let body = delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        fileContent +
        closeDelimiter;

      const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': `multipart/related; boundary="${boundary}"`,
          },
          body: body,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, response.statusText, errorText);
        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      return { success: true, fileId: result.id, fileName };
    } catch (error) {
      console.error('Backup upload failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async listBackups() {
    try {
      const accessToken = await GoogleAuthService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=parents in 'appDataFolder'&orderBy=createdTime desc&fields=files(id,name,createdTime,size)&spaces=appDataFolder`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('List backups failed:', response.status, response.statusText, errorText);
        throw new Error(`Failed to list backups: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('List backups result:', result);
      return { success: true, files: result.files || [] };
    } catch (error) {
      console.error('Failed to list backups:', error);
      return { success: false, error: error.message };
    }
  }

  static async downloadBackup(fileId) {
    try {
      const accessToken = await GoogleAuthService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const backupData = await response.json();
      return { success: true, data: backupData };
    } catch (error) {
      console.error('Backup download failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteBackup(fileId) {
    try {
      const accessToken = await GoogleAuthService.getValidAccessToken();
      if (!accessToken) {
        throw new Error('No valid access token available');
      }

      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      return { success: true };
    } catch (error) {
      console.error('Backup delete failed:', error);
      return { success: false, error: error.message };
    }
  }

  static async createBackupData(sessions, progress) {
    return {
      version: '1.0',
      timestamp: new Date().toISOString(),
      app: 'meditation-tracker',
      data: {
        sessions,
        progress,
        exported_at: new Date().toISOString()
      }
    };
  }
}