import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMeditation } from '../context/MeditationContext';
import { BackupService } from '../services/backupService';
import MergePreviewModal from '../components/MergePreviewModal';

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

  useEffect(() => {
    checkAuthStatus();
  }, []);

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

  const loadBackups = async () => {
    try {
      const result = await BackupService.listBackups();
      if (result.success) {
        setBackups(result.files);
      } else {
        Alert.alert('Error', 'Failed to load backups: ' + result.error);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
      Alert.alert('Error', 'Failed to load backups');
    }
  };

  const handleGoogleSignIn = async () => {
    setOperationInProgress(true);
    try {
      const result = await BackupService.authenticateWithGoogle();
      if (result.success) {
        setIsAuthenticated(true);
        await loadBackups();
        Alert.alert('Success', 'Successfully connected to Google Drive');
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
              await BackupService.signOutFromGoogle();
              setIsAuthenticated(false);
              setBackups([]);
              Alert.alert('Success', 'Signed out successfully');
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
        await loadBackups();
        Alert.alert('Success', `Backup created successfully: ${result.fileName}`);
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
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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
              <Ionicons name="logo-google" size={20} color="white" />
              <Text style={styles.buttonText}>Connect to Google Drive</Text>
              {operationInProgress && (
                <ActivityIndicator size="small" color="white" style={styles.buttonLoader} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.authenticatedSection}>
              <View style={styles.statusContainer}>
                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                <Text style={styles.statusText}>Connected to Google Drive</Text>
              </View>

              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={handleBackup}
                  disabled={operationInProgress}
                >
                  <Ionicons name="cloud-upload" size={18} color="white" />
                  <Text style={styles.actionButtonText}>Create Backup</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleSignOut}
                  disabled={operationInProgress}
                >
                  <Ionicons name="log-out" size={18} color="#666" />
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
                <Ionicons name="cloud-outline" size={48} color="#ccc" />
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
                      <Ionicons name="git-merge" size={20} color="#4A90E2" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconButton}
                      onPress={() => handleDeleteBackup(backup)}
                      disabled={operationInProgress}
                    >
                      <Ionicons name="trash" size={20} color="#f44336" />
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
              <Ionicons name="shield-checkmark" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>Your data is stored privately in your Google Drive</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="time" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>Backups include all your meditation sessions and progress</Text>
            </View>
            <View style={styles.infoItem}>
              <Ionicons name="sync" size={16} color="#4CAF50" />
              <Text style={styles.infoText}>Restore your data on any device by signing in</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {operationInProgress && (
        <View style={styles.overlay}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size="large" color="#4A90E2" />
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
    backgroundColor: '#f5f5f5',
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
    color: '#666',
  },
  section: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  buttonText: {
    color: 'white',
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
    backgroundColor: '#f0f8f0',
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 6,
  },
  secondaryButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
    fontWeight: '500',
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
  },
  backupInfo: {
    flex: 1,
  },
  backupDate: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  backupSize: {
    fontSize: 12,
    color: '#666',
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
    color: '#666',
    lineHeight: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    minWidth: 150,
  },
  overlayText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});

export default BackupScreen;