import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Vibration,
  Platform,
  AppState,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { Audio } from 'expo-av';

interface PomodoroTimerProps {
  visible: boolean;
  onClose: () => void;
  sessionTitle?: string;
  onComplete?: () => void;
}

type TimerMode = 'focus' | 'short_break' | 'long_break';

const TIMER_DURATIONS = {
  focus: 25 * 60, // 25 minutes
  short_break: 5 * 60, // 5 minutes
  long_break: 15 * 60, // 15 minutes
};

export default function PomodoroTimer({ visible, onClose, sessionTitle, onComplete }: PomodoroTimerProps) {
  const { colors, accentColor } = useTheme();
  
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATIONS.focus);
  const [isRunning, setIsRunning] = useState(false);
  const [completedPomodoros, setCompletedPomodoros] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, timeLeft]);
  
  const handleTimerComplete = async () => {
    setIsRunning(false);
    
    // Vibrate
    if (Platform.OS !== 'web') {
      Vibration.vibrate([0, 500, 200, 500]);
    }
    
    // Play sound
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/timer_complete.mp3')
      );
      soundRef.current = sound;
      await sound.playAsync();
    } catch (e) {
      console.log('Sound not available');
    }
    
    if (mode === 'focus') {
      const newCount = completedPomodoros + 1;
      setCompletedPomodoros(newCount);
      
      // Every 4 pomodoros, take a long break
      if (newCount % 4 === 0) {
        setMode('long_break');
        setTimeLeft(TIMER_DURATIONS.long_break);
      } else {
        setMode('short_break');
        setTimeLeft(TIMER_DURATIONS.short_break);
      }
    } else {
      setMode('focus');
      setTimeLeft(TIMER_DURATIONS.focus);
    }
  };
  
  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(TIMER_DURATIONS[mode]);
  };
  
  const switchMode = (newMode: TimerMode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(TIMER_DURATIONS[newMode]);
  };
  
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  const progress = ((TIMER_DURATIONS[mode] - timeLeft) / TIMER_DURATIONS[mode]) * 100;
  
  const getModeColor = () => {
    switch (mode) {
      case 'focus': return accentColor;
      case 'short_break': return '#10B981';
      case 'long_break': return '#8B5CF6';
    }
  };
  
  const getModeLabel = () => {
    switch (mode) {
      case 'focus': return 'Concentration';
      case 'short_break': return 'Pause courte';
      case 'long_break': return 'Pause longue';
    }
  };
  
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Mode Focus</Text>
          <View style={{ width: 40 }} />
        </View>
        
        {sessionTitle && (
          <View style={[styles.sessionBadge, { backgroundColor: colors.surfaceVariant }]}>
            <Ionicons name="book" size={16} color={accentColor} />
            <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
              {sessionTitle}
            </Text>
          </View>
        )}
        
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          {(['focus', 'short_break', 'long_break'] as TimerMode[]).map((m) => (
            <TouchableOpacity
              key={m}
              style={[
                styles.modeButton,
                { backgroundColor: mode === m ? getModeColor() : colors.surfaceVariant },
              ]}
              onPress={() => switchMode(m)}
            >
              <Text style={[
                styles.modeButtonText,
                { color: mode === m ? '#FFFFFF' : colors.textSecondary },
              ]}>
                {m === 'focus' ? 'Focus' : m === 'short_break' ? 'Pause' : 'Longue'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Timer Display */}
        <View style={styles.timerContainer}>
          <View style={[styles.timerCircle, { borderColor: getModeColor() }]}>
            <View style={[styles.timerProgress, { backgroundColor: getModeColor(), height: `${progress}%` }]} />
            <View style={styles.timerContent}>
              <Text style={[styles.modeLabel, { color: getModeColor() }]}>{getModeLabel()}</Text>
              <Text style={[styles.timerText, { color: colors.text }]}>{formatTime(timeLeft)}</Text>
            </View>
          </View>
        </View>
        
        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.surfaceVariant }]}
            onPress={resetTimer}
          >
            <Ionicons name="refresh" size={28} color={colors.text} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.playButton, { backgroundColor: getModeColor() }]}
            onPress={toggleTimer}
          >
            <Ionicons name={isRunning ? 'pause' : 'play'} size={40} color="#FFFFFF" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.controlButton, { backgroundColor: colors.surfaceVariant }]}
            onPress={() => setTimeLeft((prev) => Math.max(0, prev - 60))}
          >
            <Ionicons name="play-skip-forward" size={28} color={colors.text} />
          </TouchableOpacity>
        </View>
        
        {/* Pomodoro Count */}
        <View style={styles.pomodoroCount}>
          <Text style={[styles.pomodoroLabel, { color: colors.textSecondary }]}>Pomodoros complétés</Text>
          <View style={styles.pomodoroIcons}>
            {[...Array(4)].map((_, i) => (
              <Ionicons
                key={i}
                name="ellipse"
                size={16}
                color={i < (completedPomodoros % 4) ? accentColor : colors.border}
              />
            ))}
          </View>
          <Text style={[styles.pomodoroTotal, { color: colors.text }]}>
            {completedPomodoros} total
          </Text>
        </View>
        
        {/* Tips */}
        <View style={[styles.tips, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="information-circle" size={20} color={accentColor} />
          <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
            La technique Pomodoro: 25 min de travail, 5 min de pause. Après 4 cycles, prenez une pause longue de 15 min.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '600' },
  sessionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
    gap: 8,
  },
  sessionTitle: { fontSize: 14, fontWeight: '500', maxWidth: 200 },
  modeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  modeButtonText: { fontSize: 14, fontWeight: '500' },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  timerProgress: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    opacity: 0.2,
  },
  timerContent: {
    alignItems: 'center',
  },
  modeLabel: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  timerText: { fontSize: 72, fontWeight: '200' },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginBottom: 32,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pomodoroCount: {
    alignItems: 'center',
    marginBottom: 24,
  },
  pomodoroLabel: { fontSize: 12, marginBottom: 8 },
  pomodoroIcons: { flexDirection: 'row', gap: 8 },
  pomodoroTotal: { fontSize: 14, fontWeight: '600', marginTop: 8 },
  tips: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 32,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  tipsText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
