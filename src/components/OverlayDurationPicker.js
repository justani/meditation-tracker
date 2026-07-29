import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SESSION_TYPES } from '../types';
import { COLORS } from '../theme/colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');

const OverlayDurationPicker = ({ visible, onClose, onConfirm, onCancel, sessionType }) => {
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0); // Default to 60 minutes (1 hour)

  if (!visible) return null;


  const isMorning = sessionType === SESSION_TYPES.MORNING;
  const sessionLabel = isMorning ? 'Morning' : 'Evening';
  const sessionIcon = isMorning ? '☀️' : '🌙';

  // Generate arrays for picker values
  const hourOptions = Array.from({ length: 4 }, (_, i) => i); // 0-3 hours
  const minuteOptions = Array.from({ length: 12 }, (_, i) => i * 5); // 0, 5, 10, 15, ..., 55 minutes

  const handleConfirm = () => {
    const totalMinutes = hours * 60 + minutes;
    if (totalMinutes > 0) {
      onConfirm(totalMinutes);
    }
    onClose();
  };

  const handleCancel = () => {
    // Reset to defaults
    setHours(1);
    setMinutes(0);
    if (onCancel) {
      onCancel();
    }
    onClose();
  };

  const formatTime = (hours, minutes) => {
    if (hours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const PickerColumn = ({ options, selectedValue, onSelect, label, suffix = '' }) => (
    <View style={styles.pickerColumn}>
      <Text style={styles.pickerLabel}>{label}</Text>
      <ScrollView 
        style={styles.pickerScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerContent}
      >
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.pickerOption,
              selectedValue === option && styles.selectedOption
            ]}
            onPress={() => onSelect(option)}
          >
            <Text style={[
              styles.pickerOptionText,
              selectedValue === option && styles.selectedOptionText
            ]}>
              {option}{suffix}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.overlay}>
      <View style={styles.modalContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerAction}
            onPress={handleCancel}
            accessibilityRole="button"
          >
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.sessionIcon}>{sessionIcon}</Text>
            <Text style={styles.title}>{sessionLabel} Meditation</Text>
          </View>
          <View style={styles.headerAction} />
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.instruction}>
            How long did you meditate?
          </Text>

          <View style={styles.selectedTimeContainer}>
            <Text style={styles.selectedTimeText}>
              {formatTime(hours, minutes)}
            </Text>
          </View>

          <View style={styles.pickersContainer}>
            <PickerColumn
              options={hourOptions}
              selectedValue={hours}
              onSelect={setHours}
              label="Hours"
            />
            
            <View style={styles.pickerSeparator} />
            
            <PickerColumn
              options={minuteOptions}
              selectedValue={minutes}
              onSelect={setMinutes}
              label="Minutes"
            />
          </View>

          <View style={styles.presetContainer}>
            <Text style={styles.presetLabel}>Quick Select:</Text>
            <View style={styles.presetButtons}>
              {[5, 10, 15, 20, 30, 45, 60].map((mins) => (
                <TouchableOpacity
                  key={mins}
                  style={[
                    styles.presetButton,
                    (hours * 60 + minutes) === mins && styles.selectedPreset
                  ]}
                  onPress={() => {
                    setHours(Math.floor(mins / 60));
                    setMinutes(mins % 60);
                  }}
                >
                  <Text style={[
                    styles.presetButtonText,
                    (hours * 60 + minutes) === mins && styles.selectedPresetText
                  ]}>
                    {mins}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleConfirm}
            accessibilityRole="button"
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.overlay,
    paddingTop: 50, // Leave space for status bar
    zIndex: 9999,
  },
  modalContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 20,
    width: '100%',
    height: '100%',
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerAction: {
    width: 64,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  cancelButton: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  contentScroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 24,
  },
  instruction: {
    fontSize: 16,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  selectedTimeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTimeText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primaryInk,
  },
  pickersContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: 10,
  },
  pickerSeparator: {
    width: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 15,
  },
  pickerScroll: {
    maxHeight: 140,
  },
  pickerContent: {
    alignItems: 'center',
  },
  pickerOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 2,
    minWidth: 60,
  },
  selectedOption: {
    backgroundColor: COLORS.primaryActive,
  },
  pickerOptionText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
  },
  selectedOptionText: {
    color: COLORS.onPrimary,
    fontWeight: '600',
  },
  presetContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
    marginBottom: 12,
  },
  presetButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  selectedPreset: {
    backgroundColor: COLORS.primaryActive,
    borderColor: COLORS.primaryActive,
  },
  presetButtonText: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  selectedPresetText: {
    color: COLORS.onPrimary,
  },
  footer: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
  },
  doneButton: {
    minHeight: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryActive,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.onPrimary,
  },
});

export default OverlayDurationPicker;
