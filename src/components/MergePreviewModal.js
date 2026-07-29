import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';

const MergePreviewModal = ({ 
  visible, 
  preview, 
  onConfirm, 
  onCancel, 
  loading 
}) => {
  if (!preview) {
    return null;
  }

  const hasChanges = preview.sessions.newSessions > 0 || 
                    preview.sessions.conflictsResolved > 0 || 
                    preview.settings.changed;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
            <Ionicons name="close" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Merge Preview</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Backup Info */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cloud-download" size={20} color={COLORS.primaryInk} />
              <Text style={styles.sectionTitle}>Backup Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>{formatDate(preview.backupDate)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version:</Text>
              <Text style={styles.infoValue}>{preview.backupVersion}</Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={20} color={COLORS.primaryInk} />
              <Text style={styles.sectionTitle}>Merge Summary</Text>
            </View>
            <Text style={styles.summaryText}>{preview.summary}</Text>
          </View>

          {/* Session Changes */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color={COLORS.primaryInk} />
              <Text style={styles.sectionTitle}>Sessions</Text>
            </View>
            
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{preview.sessions.newSessions}</Text>
                <Text style={styles.statLabel}>New Sessions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{preview.sessions.conflictsResolved}</Text>
                <Text style={styles.statLabel}>Conflicts Resolved</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{preview.sessions.totalAfterMerge}</Text>
                <Text style={styles.statLabel}>Total After Merge</Text>
              </View>
            </View>

            {preview.sessions.conflicts && preview.sessions.conflicts.length > 0 && (
              <View style={styles.conflictSection}>
                <Text style={styles.conflictHeader}>Conflict Resolution Details:</Text>
                {preview.sessions.conflicts.slice(0, 3).map((conflict, index) => (
                  <View key={index} style={styles.conflictItem}>
                    <Text style={styles.conflictDate}>
                      {new Date(conflict.date).toLocaleDateString()} - {conflict.type}
                    </Text>
                    <Text style={styles.conflictReason}>{conflict.reason}</Text>
                  </View>
                ))}
                {preview.sessions.conflicts.length > 3 && (
                  <Text style={styles.moreConflicts}>
                    +{preview.sessions.conflicts.length - 3} more conflicts...
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Settings Changes */}
          {preview.settings.changed && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="settings" size={20} color={COLORS.primaryInk} />
                <Text style={styles.sectionTitle}>Settings</Text>
              </View>
              
              {preview.settings.changes.map((change, index) => (
                <View key={index} style={styles.settingChange}>
                  <Text style={styles.settingKey}>{change.key}</Text>
                  <Text style={styles.settingAction}>{change.action}: {JSON.stringify(change.value)}</Text>
                  <Text style={styles.settingReason}>{change.reason}</Text>
                </View>
              ))}
            </View>
          )}

          {!hasChanges && (
            <View style={styles.noChangesSection}>
              <Ionicons name="checkmark-circle" size={48} color={COLORS.success} />
              <Text style={styles.noChangesTitle}>No Changes Needed</Text>
              <Text style={styles.noChangesText}>
                Your local data is already up to date with this backup.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.cancelButtonLarge}
            onPress={onCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.confirmButton, !hasChanges && styles.confirmButtonDisabled]}
            onPress={onConfirm}
            disabled={loading || !hasChanges}
          >
            <Ionicons name="checkmark" size={20} color={COLORS.onPrimary} />
            <Text style={styles.confirmButtonText}>
              {hasChanges ? 'Merge Data' : 'Already Up to Date'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cancelButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  summaryText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  },
  statGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primaryInk,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
  },
  conflictSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  conflictHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  conflictItem: {
    marginBottom: 8,
    padding: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 6,
  },
  conflictDate: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  conflictReason: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  moreConflicts: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
  settingChange: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: COLORS.surfaceMuted,
    borderRadius: 6,
  },
  settingKey: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  settingAction: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  settingReason: {
    fontSize: 12,
    color: COLORS.textSubtle,
    marginTop: 2,
  },
  noChangesSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    margin: 16,
    borderRadius: 12,
  },
  noChangesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 16,
  },
  noChangesText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  cancelButtonLarge: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceMuted,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: COLORS.primaryActive,
    gap: 8,
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
});

export default MergePreviewModal;
