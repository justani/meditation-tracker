import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  AppState,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMeditation } from '../context/MeditationContext';
import { BackupService } from '../services/backupService';
import MergePreviewModal from '../components/MergePreviewModal';
import { COLORS } from '../theme/colors';

const BackupScreen = () => {
  const { loadAppData } = useMeditation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState(false);
  const [mergePreview, setMergePreview] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedBackupId, setSelectedBackupId] = useState(null);
  const [lastBackupAt, setLastBackupAt] = useState(null);

  useEffect(() => {
    checkAuthStatus();
    loadBackupState();

    const unsubscribe = BackupService.subscribeToBackupState((backupState, event) => {
      setLastBackupAt(backupState.lastSuccessfulBackupAt);
      if (event.backupListChanged) {
        loadBackups({ showError: false });
      }
    });
    const appStateSubscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        loadBackupState();
      }
    });

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  const loadBackupState = async () => {
    const backupState = await BackupService.getBackupState();
    setLastBackupAt(backupState.lastSuccessfulBackupAt);
  };

  const checkAuthStatus = async () => {
    try {
      const authenticated = await BackupService.isGoogleAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        await loadBackups();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBackups = async ({ showError = true } = {}) => {
    try {
      const result = await BackupService.listBackups();
      if (result.success) {
        setBackups(result.files);
      } else if (showError) {
        Alert.alert('Error', 'Failed to load backups: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      if (showError) {
        Alert.alert('Error', 'Failed to load backups');
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setOperationInProgress(true);
    try {
      const result = await BackupService.authenticateWithGoogle();
      if (result.success) {
        setIsAuthenticated(true);
        let backupResult = await BackupService.uploadBackup();
        if (backupResult.skipped) {
          backupResult = await BackupService.uploadBackup();
        }
        await loadBackups();
        if (backupResult.success) {
          Alert.alert('Success', 'Connected to Google Drive and created your first backup.');
        } else {
          Alert.alert(
            'Connected to Google Drive',
            'The first backup could not be created. The app will try again next time it opens.'
          );
        }
      } else {
        Alert.alert('Error', 'Failed to connect to Google Drive: ' + result.error);
      }
    } catch (error) {
      console.error('Error signing in:', error);
      Alert.alert('Error', 'Failed to connect to Google Drive');
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Google Drive?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            setOperationInProgress(true);
            try {
              const result = await BackupService.signOutFromGoogle();
              if (result.success) {
                setIsAuthenticated(false);
                setBackups([]);
                Alert.alert('Success', 'Signed out successfully');
              } else {
                Alert.alert('Error', 'Failed to sign out: ' + result.error);
              }
            } catch (error) {
              console.error('Error signing out:', error);
              Alert.alert('Error', 'Failed to sign out');
            } finally {
              setOperationInProgress(false);
            }
          }
        }
      ]
    );
  };

  const handleBackup = async () => {
    setOperationInProgress(true);
    try {
      const result = await BackupService.uploadBackup();
      if (result.success) {
        if (result.skipped) {
          Alert.alert('Up to Date', 'Your meditation data has not changed since the last backup.');
        } else {
          Alert.alert('Success', `Backup created successfully: ${result.fileName}`);
        }
      } else {
        Alert.alert('Error', 'Failed to create backup: ' + result.error);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup');
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleRestore = async (backup) => {
    setOperationInProgress(true);
    setSelectedBackupId(backup.id);
    
    try {
      const result = await BackupService.getRestorePreview(backup.id);
      if (result.success) {
        setMergePreview(result.preview);
        setShowPreviewModal(true);
      } else {
        Alert.alert('Error', 'Failed to load backup preview: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading preview:', error);
      Alert.alert('Error', 'Failed to load backup preview');
    } finally {
      setOperationInProgress(false);
    }
  };

  const handleConfirmMerge = async () => {
    if (!selectedBackupId) return;

    setOperationInProgress(true);
    setShowPreviewModal(false);
    
    try {
      const result = await BackupService.mergeFromBackup(selectedBackupId);
      if (result.success) {
        await loadAppData();
        
        // Show success with summary
        const summary = result.summary;
        let message = 'Backup merged successfully!';
        if (summary.newSessions > 0 || summary.conflictsResolved > 0) {
          message += `\n\n• ${summary.newSessions} new sessions added`;
          if (summary.conflictsResolved > 0) {
            message += `\n• ${summary.conflictsResolved} conflicts resolved`;
          }
        }
        
        Alert.alert('Success', message);
        await loadBackups(); // Refresh backup list
      } else {
        Alert.alert('Error', 'Failed to merge backup: ' + result.error);
      }
    } catch (error) {
      console.error('Error merging backup:', error);
      Alert.alert('Error', 'Failed to merge backup');
    } finally {
      setOperationInProgress(false);
      setSelectedBackupId(null);
      setMergePreview(null);
    }
  };

  const handleCancelMerge = () => {
    setShowPreviewModal(false);
    setSelectedBackupId(null);
    setMergePreview(null);
  };

  const handleDeleteBackup = async (backup) => {
    Alert.alert(
      'Delete Backup',
      `Delete backup from ${formatDate(backup.createdTime)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setOperationInProgress(true);
            try {
              const result = await BackupService.deleteBackup(backup.id);
              if (result.success) {
                await loadBackups();
                Alert.alert('Success', 'Backup deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete backup: ' + result.error);
              }
            } catch (error) {
              console.error('Error deleting backup:', error);
              Alert.alert('Error', 'Failed to delete backup');
            } finally {
              setOperationInProgress(false);
            }
          }
        }
      ]
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkAuthStatus();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryInk} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Google Drive Backup</Text>
          <Text style={styles.sectionDescription}>
            Securely backup your meditation data to your private Google Drive folder.
          </Text>

          {!isAuthenticated ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoogleSignIn}
              disabled={operationInProgress}
            >
              <Ionicons name="logo-google" size={20} color={COLORS.onPrimary} />
              <Text style={styles.buttonText}>Connect to Google Drive</Text>
              {operationInProgress && (
                <ActivityIndicator size="small" color={COLORS.onPrimary} style={styles.buttonLoader} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.authenticatedSection}>
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusText}>Connected to Google Drive</Text>
                  <Text style={styles.lastBackupText}>
                    {lastBackupAt
                      ? `Last backed up ${formatDate(lastBackupAt)}`
                      : 'No successful backups yet'}
                  </Text>
                </View>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleBackup}
                  disabled={operationInProgress}
                >
                  <Ionicons name="cloud-upload" size={18} color={COLORS.onPrimary} />
                  <Text style={styles.actionButtonText}>Create Backup</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSignOut}
                  disabled={operationInProgress}
                >
                  <Ionicons name="log-out" size={18} color={COLORS.textMuted} />
                  <Text style={styles.secondaryButtonText}>Sign Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Backups</Text>
            {backups.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="cloud-outline" size={48} color={COLORS.disabled} />
                <Text style={styles.emptyStateText}>No backups found</Text>
                <Text style={styles.emptyStateSubtext}>Create your first backup above</Text>
              </View>
            ) : (
              backups.map((backup) => (
                <View key={backup.id} style={styles.backupItem}>
                  <View style={styles.backupInfo}>
                    <Text style={styles.backupDate}>{formatDate(backup.createdTime)}</Text>
                    <Text style={styles.backupSize}>{formatFileSize(backup.size)}</Text>
                  </View>
                  <View style={styles.backupActions}>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleRestore(backup)}
                      disabled={operationInProgress}
                    >
                      <Ionicons name="git-merge" size={20} color={COLORS.primaryInk} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteBackup(backup)}
                      disabled={operationInProgress}
                    >
                      <Ionicons name="trash" size={20} color={COLORS.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Backups</Text>
          <View style={styles.infoList}>
            <View style={styles.infoItem}>
              <Ionicons name="shield-checkmark" size={16} color={COLORS.success} />
              <Text style={styles.infoText}>Your data is stored privately in your Google Drive</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color={COLORS.success} />
              <Text style={styles.infoText}>Backups include all your meditation sessions and progress</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="sync" size={16} color={COLORS.success} />
              <Text style={styles.infoText}>Restore your data on any device by signing in</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="refresh" size={16} color={COLORS.success} />
              <Text style={styles.infoText}>
                Changed data is backed up automatically every 2 days when you open the app
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="albums" size={16} color={COLORS.success} />
              <Text style={styles.infoText}>Your latest 20 backups are kept</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {operationInProgress && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color={COLORS.primaryInk} />
            <Text style={styles.overlayText}>Processing...</Text>
          </View>
        </View>
      )}

      <MergePreviewModal
        visible={showPreviewModal}
        preview={mergePreview}
        onConfirm={handleConfirmMerge}
        onCancel={handleCancelMerge}
        loading={operationInProgress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: COLORS.textMuted,
  },
  section: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: COLORS.primaryActive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: COLORS.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonLoader: {
    marginLeft: 8,
  },
  authenticatedSection: {
    gap: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    color: COLORS.success,
    fontWeight: '500',
  },
  statusTextContainer: {
    flex: 1,
  },
  lastBackupText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.primaryActive,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: COLORS.onPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  secondaryButtonText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textMuted,
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSubtle,
    marginTop: 4,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 8,
    marginBottom: 8,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  backupSize: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 150,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: COLORS.textMuted,
  },
});

export default BackupScreen;
