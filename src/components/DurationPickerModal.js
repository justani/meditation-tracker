import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { SESSION_TYPES } from '../types';

const DurationPickerModal = ({ visible, onClose, onConfirm, onCancel, sessionType }) => {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(10); // Default to 10 minutes


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
    setHours(0);
    setMinutes(10);
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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.sessionIcon}>{sessionIcon}</Text>
            <Text style={styles.title}>{sessionLabel} Meditation</Text>
          </View>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={styles.confirmButton}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
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
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  instruction: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  selectedTimeContainer: {
    alignItems: 'center',
    marginBottom: 30,
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedTimeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#4A90E2',
  },
  pickersContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    shadowColor: '#000',
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
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  pickerSeparator: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 15,
  },
  pickerScroll: {
    maxHeight: 150,
  },
  pickerContent: {
    alignItems: 'center',
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginVertical: 2,
  },
  selectedOption: {
    backgroundColor: '#4A90E2',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    minWidth: 40,
  },
  selectedOptionText: {
    color: '#fff',
    fontWeight: '600',
  },
  presetContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  presetLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedPreset: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  presetButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  selectedPresetText: {
    color: '#fff',
  },
});

export default DurationPickerModal;