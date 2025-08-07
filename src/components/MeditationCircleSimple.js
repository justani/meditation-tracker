import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { SESSION_TYPES } from '../types';

export default function MeditationCircleSimple({ 
  type, 
  completed = false, 
  onPress, 
  onLongPress,
  disabled = false 
}) {
  const [isPressed, setIsPressed] = useState(false);
  const [fillAnim] = useState(new Animated.Value(completed ? 1 : 0));
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const isMorning = type === SESSION_TYPES.MORNING;
  const icon = isMorning ? '☀️' : '🌙';
  const label = isMorning ? 'Morning' : 'Evening';
  
  // Animation duration for long press feedback
  const LONG_PRESS_DURATION = 800;
  
  // Update fill animation when completed state changes
  useEffect(() => {
    if (completed) {
      // Success animation: scale up briefly
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Fill animation
      Animated.spring(fillAnim, {
        toValue: 1,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(fillAnim, {
        toValue: 0,
        useNativeDriver: false,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [completed, fillAnim, scaleAnim]);
  
  const circleStyle = [
    styles.circle,
    completed && styles.completedCircle,
    disabled && styles.disabledCircle,
    isPressed && styles.pressedCircle
  ];
  
  const iconStyle = [
    styles.icon,
    completed && styles.completedIcon
  ];
  
  const handlePressIn = () => {
    setIsPressed(true);
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };
  
  const handleLongPress = () => {
    setIsPressed(false);
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
    
    if (onLongPress) {
      onLongPress();
    }
  };
  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };
  
  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 120],
  });
  
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      delayLongPress={LONG_PRESS_DURATION}
    >
      <Animated.View style={[circleStyle, { transform: [{ scale: scaleAnim }] }]}>
        {/* Animated Fill */}
        <Animated.View style={[styles.animatedFill, { height: fillHeight }]} />
        
        {/* Icon */}
        <Text style={iconStyle}>{icon}</Text>
      </Animated.View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 3,
    borderColor: '#e9ecef',
    position: 'relative',
    overflow: 'hidden',
  },
  completedCircle: {
    borderColor: '#4A90E2',
    backgroundColor: '#f0f7ff',
  },
  disabledCircle: {
    opacity: 0.5,
  },
  pressedCircle: {
    shadowOpacity: 0.2,
  },
  animatedFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  icon: {
    fontSize: 32,
    zIndex: 1,
  },
  completedIcon: {
    fontSize: 36,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginTop: 8,
  },
});