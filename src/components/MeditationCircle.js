import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { SESSION_TYPES } from '../types';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function MeditationCircle({ 
  type, 
  completed = false, 
  onPress, 
  onLongPress,
  disabled = false 
}) {
  const [isPressed, setIsPressed] = useState(false);
  const isMorning = type === SESSION_TYPES.MORNING;
  const icon = isMorning ? '☀️' : '🌙';
  const label = isMorning ? 'Morning' : 'Evening';
  
  // Animated values
  const fillProgress = useSharedValue(completed ? 1 : 0);
  const scaleValue = useSharedValue(1);
  const longPressProgress = useSharedValue(completed ? 1 : 0);
  const [isLongPressing, setIsLongPressing] = useState(false);
  
  // Animation duration for long press feedback
  const LONG_PRESS_DURATION = 800;
  
  // Circle progress ring constants
  const CIRCLE_RADIUS = 58; // Slightly smaller than circle radius (60) for proper positioning
  const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
  
  // Update fill animation when completed state changes
  useEffect(() => {
    if (completed) {
      // Success animation: scale up briefly then fill
      scaleValue.value = withSpring(1.1, { damping: 10 });
      fillProgress.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      // Update progress ring to full for completed sessions
      longPressProgress.value = withSpring(1, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      
      // Reset scale after animation
      setTimeout(() => {
        scaleValue.value = withSpring(1, { damping: 10 });
      }, 300);
    } else {
      fillProgress.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
      // Update progress ring to empty for incomplete sessions
      longPressProgress.value = withSpring(0, {
        damping: 15,
        stiffness: 150,
        mass: 1,
      });
    }
  }, [completed]);
  
  // Animated styles
  const animatedCircleStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleValue.value }],
    };
  });
  
  const fillAnimatedStyle = useAnimatedStyle(() => {
    const height = interpolate(fillProgress.value, [0, 1], [0, 120]);
    const opacity = interpolate(fillProgress.value, [0, 0.1, 1], [0, 0.3, 0.8]);
    
    return {
      height,
      opacity,
    };
  });
  
  const glowAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(fillProgress.value, [0, 0.7, 1], [0, 0, 0.6]);
    const scale = interpolate(fillProgress.value, [0, 1], [0.8, 1.2]);
    
    return {
      opacity,
      transform: [{ scale }],
    };
  });
  
  const progressRingStyle = useAnimatedStyle(() => {
    const strokeDashoffset = interpolate(
      longPressProgress.value,
      [0, 1],
      [CIRCLE_CIRCUMFERENCE, 0]
    );
    const opacity = interpolate(longPressProgress.value, [0, 0.1, 1], [0, 0.8, 1]);
    
    return {
      strokeDashoffset,
      opacity,
    };
  });
  
  const circleStyle = [
    styles.circle,
    completed && styles.completedCircle,
    disabled && styles.disabledCircle
  ];
  
  const iconStyle = [
    styles.icon,
    completed && styles.completedIcon
  ];
  
  const handlePressIn = () => {
    setIsPressed(true);
    scaleValue.value = withSpring(0.95);
    
    // Add gentle haptic feedback on press start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Start long press feedback animation
    setIsLongPressing(true);
    
    if (completed) {
      // For removal: start from filled (1) and go to empty (0) - anti-clockwise unfill
      longPressProgress.value = withTiming(0, { duration: LONG_PRESS_DURATION });
    } else {
      // For completion: start from empty (0) and go to filled (1) - clockwise fill
      longPressProgress.value = withTiming(1, { duration: LONG_PRESS_DURATION });
    }
  };
  
  const handlePressOut = () => {
    setIsPressed(false);
    scaleValue.value = withSpring(1);
    
    // Reset long press feedback to initial state based on completion status
    setIsLongPressing(false);
    if (completed) {
      // Reset to full for completed sessions
      longPressProgress.value = withTiming(1, { duration: 200 });
    } else {
      // Reset to empty for incomplete sessions
      longPressProgress.value = withTiming(0, { duration: 200 });
    }
  };
  
  const handleLongPress = () => {
    setIsPressed(false);
    setIsLongPressing(false);
    scaleValue.value = withSpring(1);
    
    if (completed) {
      // Removing completed session - ring should disappear
      longPressProgress.value = withTiming(0, { duration: 200 });
      // Removal feedback - softer impact
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Direct removal for completed sessions
      if (onLongPress) {
        onLongPress();
      }
    } else {
      // Show duration picker for new sessions
      if (onLongPress) {
        onLongPress(); // This will now trigger the parent to show duration picker
      }
    }
  };

  
  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };
  
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
      <View style={styles.circleContainer}>
        {/* Progress Ring */}
        <Svg
          style={styles.progressRing}
          width="124"
          height="124"
          viewBox="0 0 124 124"
        >
          <AnimatedCircle
            cx="62"
            cy="62"
            r={CIRCLE_RADIUS}
            stroke="#4A90E2"
            strokeWidth="3"
            fill="none"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeLinecap="round"
            transform="rotate(-90 62 62)"
            animatedProps={progressRingStyle}
          />
        </Svg>
        
        <Animated.View style={[circleStyle, animatedCircleStyle]}>
          {/* Glow Effect */}
          <Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />
          
          {/* Animated Fill */}
          <Animated.View style={[styles.animatedFill, fillAnimatedStyle]} />
          
          {/* Icon */}
          <Text style={iconStyle}>{icon}</Text>
        </Animated.View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressRing: {
    position: 'absolute',
    top: -2,
    left: -2,
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
  animatedFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
  },
  glowEffect: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(74, 144, 226, 0.2)',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
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