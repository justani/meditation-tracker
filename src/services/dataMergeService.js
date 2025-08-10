export class DataMergeService {
  static mergeSessions(localSessions, backupSessions) {
    const mergeResult = {
      mergedSessions: [],
      conflicts: [],
      newSessions: 0,
      conflictsResolved: 0
    };

    const sessionMap = new Map();
    const conflicts = [];

    // First pass: Add all local sessions to the map
    localSessions.forEach(session => {
      const key = `${session.date}_${session.type}`;
      sessionMap.set(key, {
        session,
        source: 'local',
        isConflict: false
      });
    });

    // Second pass: Process backup sessions
    backupSessions.forEach(backupSession => {
      const key = `${backupSession.date}_${backupSession.type}`;
      
      if (sessionMap.has(key)) {
        // Conflict detected
        const localEntry = sessionMap.get(key);
        const localSession = localEntry.session;
        
        const conflict = this.resolveSessionConflict(localSession, backupSession);
        conflicts.push(conflict);
        
        sessionMap.set(key, {
          session: conflict.chosenSession,
          source: conflict.source,
          isConflict: true,
          conflict: conflict
        });
        
        mergeResult.conflictsResolved++;
      } else {
        // New session from backup
        sessionMap.set(key, {
          session: backupSession,
          source: 'backup',
          isConflict: false
        });
        mergeResult.newSessions++;
      }
    });

    // Convert map back to array
    mergeResult.mergedSessions = Array.from(sessionMap.values()).map(entry => entry.session);
    mergeResult.conflicts = conflicts;

    return mergeResult;
  }

  static resolveSessionConflict(localSession, backupSession) {
    const conflict = {
      date: localSession.date,
      type: localSession.type,
      localSession,
      backupSession,
      chosenSession: null,
      source: null,
      reason: null
    };

    // Rule 1: Keep the one with more recent completedAt timestamp
    if (localSession.completedAt && backupSession.completedAt) {
      if (localSession.completedAt >= backupSession.completedAt) {
        conflict.chosenSession = localSession;
        conflict.source = 'local';
        conflict.reason = 'More recent completion time';
      } else {
        conflict.chosenSession = backupSession;
        conflict.source = 'backup';
        conflict.reason = 'More recent completion time';
      }
    }
    // Rule 2: Keep the completed one if only one is completed
    else if (localSession.completed && !backupSession.completed) {
      conflict.chosenSession = localSession;
      conflict.source = 'local';
      conflict.reason = 'Local session is completed';
    }
    else if (!localSession.completed && backupSession.completed) {
      conflict.chosenSession = backupSession;
      conflict.source = 'backup';
      conflict.reason = 'Backup session is completed';
    }
    // Rule 3: Keep the one with longer duration
    else if (localSession.duration !== backupSession.duration) {
      if ((localSession.duration || 0) >= (backupSession.duration || 0)) {
        conflict.chosenSession = localSession;
        conflict.source = 'local';
        conflict.reason = 'Longer duration';
      } else {
        conflict.chosenSession = backupSession;
        conflict.source = 'backup';
        conflict.reason = 'Longer duration';
      }
    }
    // Rule 4: Default to local if all else is equal
    else {
      conflict.chosenSession = localSession;
      conflict.source = 'local';
      conflict.reason = 'Default to local data';
    }

    return conflict;
  }

  static mergeSettings(localSettings, backupSettings) {
    const mergedSettings = { ...localSettings };
    const changes = [];

    // Only merge missing keys from backup
    Object.keys(backupSettings).forEach(key => {
      if (!(key in localSettings) || localSettings[key] === null || localSettings[key] === undefined) {
        mergedSettings[key] = backupSettings[key];
        changes.push({
          key,
          action: 'added',
          value: backupSettings[key],
          reason: 'Missing in local settings'
        });
      }
    });

    return {
      mergedSettings,
      changes,
      settingsChanged: changes.length > 0
    };
  }

  static generateMergePreview(localData, backupData) {
    // Merge sessions to get statistics
    const sessionMerge = this.mergeSessions(localData.sessions || [], backupData.sessions || []);
    
    // Merge settings to get changes
    const settingsMerge = this.mergeSettings(localData.settings || {}, backupData.settings || {});

    const preview = {
      backupDate: backupData.timestamp ? new Date(backupData.timestamp).toLocaleDateString() : 'Unknown date',
      backupVersion: backupData.version || '1.0',
      
      sessions: {
        newSessions: sessionMerge.newSessions,
        conflictsResolved: sessionMerge.conflictsResolved,
        totalAfterMerge: sessionMerge.mergedSessions.length,
        conflicts: sessionMerge.conflicts
      },
      
      settings: {
        changed: settingsMerge.settingsChanged,
        changes: settingsMerge.changes
      },

      summary: this.generateSummaryText(sessionMerge, settingsMerge)
    };

    return preview;
  }

  static generateSummaryText(sessionMerge, settingsMerge) {
    const parts = [];

    if (sessionMerge.newSessions > 0) {
      parts.push(`${sessionMerge.newSessions} new session${sessionMerge.newSessions === 1 ? '' : 's'} will be added`);
    }

    if (sessionMerge.conflictsResolved > 0) {
      parts.push(`${sessionMerge.conflictsResolved} conflict${sessionMerge.conflictsResolved === 1 ? '' : 's'} will be resolved`);
    }

    if (settingsMerge.settingsChanged) {
      parts.push(`${settingsMerge.changes.length} setting${settingsMerge.changes.length === 1 ? '' : 's'} will be updated`);
    }

    if (parts.length === 0) {
      return 'No changes needed - your data is already up to date';
    }

    return parts.join(', ');
  }

  static async performMerge(localData, backupData) {
    try {
      // Merge sessions
      const sessionMerge = this.mergeSessions(localData.sessions || [], backupData.sessions || []);
      
      // Merge settings  
      const settingsMerge = this.mergeSettings(localData.settings || {}, backupData.settings || {});

      // Keep local progress as-is initially (will be recalculated by context)
      const mergedData = {
        sessions: sessionMerge.mergedSessions,
        progress: localData.progress, // Will be recalculated
        settings: settingsMerge.mergedSettings
      };

      const result = {
        success: true,
        data: mergedData,
        summary: {
          newSessions: sessionMerge.newSessions,
          conflictsResolved: sessionMerge.conflictsResolved,
          settingsChanged: settingsMerge.settingsChanged,
          conflicts: sessionMerge.conflicts
        }
      };

      return result;
    } catch (error) {
      console.error('Merge failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}