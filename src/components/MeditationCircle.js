import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedProps,
  useAnimatedStyle, 
  withTiming, 
  withSpring,
  interpolate
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { SESSION_TYPES } from '../types';
import { COLORS } from '../theme/colors';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const SessionIcon = ({ isMorning, color, size }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    {isMorning ? (
      <>
        <Circle cx="12" cy="12" r="4.25" stroke={color} strokeWidth="1.8" />
        <Line x1="12" y1="2.5" x2="12" y2="5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="12" y1="19" x2="12" y2="21.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="2.5" y1="12" x2="5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="19" y1="12" x2="21.5" y2="12" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="5.3" y1="5.3" x2="7.1" y2="7.1" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="16.9" y1="16.9" x2="18.7" y2="18.7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="5.3" y1="18.7" x2="7.1" y2="16.9" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <Line x1="16.9" y1="7.1" x2="18.7" y2="5.3" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </>
    ) : (
      <Path
        d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )}
  </Svg>
);

export default function MeditationCircle({ 
  type, 
  completed = false, 
  onPress, 
  onLongPress,
  disabled = false 
}) {
  const isMorning = type === SESSION_TYPES.MORNING;
  const label = isMorning ? 'Morning' : 'Evening';
  const sessionColor = isMorning ? COLORS.sunrise : COLORS.evening;
  const sessionOverlay = isMorning ? COLORS.sunriseOverlay : COLORS.eveningOverlay;
  
  // Animated values
  const completionProgress = useSharedValue(completed ? 1 : 0);
  const scaleValue = useSharedValue(1);
  const longPressProgress = useSharedValue(completed ? 1 : 0);
  
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
      completionProgress.value = withSpring(1, {
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
      completionProgress.value = withSpring(0, {
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
  
  const completionWashAnimatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(completionProgress.value, [0, 0.15, 1], [0, 0.4, 1]);
    const scale = interpolate(completionProgress.value, [0, 1], [0.35, 1.05]);
    
    return {
      opacity,
      transform: [{ scale }],
    };
  });
  
  const progressRingAnimatedProps = useAnimatedProps(() => {
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
    disabled && styles.disabledCircle
  ];
  
  const handlePressIn = () => {
    scaleValue.value = withSpring(0.95);
    
    // Add gentle haptic feedback on press start
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Start long press feedback animation
    if (completed) {
      // For removal: start from filled (1) and go to empty (0) - anti-clockwise unfill
      longPressProgress.value = withTiming(0, { duration: LONG_PRESS_DURATION });
    } else {
      // For completion: start from empty (0) and go to filled (1) - clockwise fill
      longPressProgress.value = withTiming(1, { duration: LONG_PRESS_DURATION });
    }
  };
  
  const handlePressOut = () => {
    scaleValue.value = withSpring(1);
    
    // Reset long press feedback to initial state based on completion status
    if (completed) {
      // Reset to full for completed sessions
      longPressProgress.value = withTiming(1, { duration: 200 });
    } else {
      // Reset to empty for incomplete sessions
      longPressProgress.value = withTiming(0, { duration: 200 });
    }
  };
  
  const handleLongPress = () => {
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
      accessibilityRole="button"
      accessibilityLabel={`${label} meditation, ${completed ? 'completed' : 'not completed'}`}
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
            stroke={sessionColor}
            strokeWidth="3"
            fill="none"
            strokeDasharray={CIRCLE_CIRCUMFERENCE}
            strokeLinecap="round"
            transform="rotate(-90 62 62)"
            animatedProps={progressRingAnimatedProps}
          />
        </Svg>
        
        <Animated.View style={[styles.shadowContainer, animatedCircleStyle]}>
          <View style={circleStyle}>
            {/* Confirmed-state wash */}
            <Animated.View
              style={[
                styles.completionWash,
                { backgroundColor: sessionOverlay },
                completionWashAnimatedStyle,
              ]}
            />

            {/* Icon */}
            <View style={styles.icon}>
              <SessionIcon
                isMorning={isMorning}
                color={sessionColor}
                size={completed ? 38 : 34}
              />
            </View>
          </View>
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
  shadowContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  circle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    overflow: 'hidden',
  },
  disabledCircle: {
    opacity: 0.5,
  },
  completionWash: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  icon: {
    zIndex: 1,
  },
  label: {
    fontSize: 14,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginTop: 8,
  },
});
