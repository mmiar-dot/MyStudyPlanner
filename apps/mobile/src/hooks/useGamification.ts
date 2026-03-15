import { useCallback } from 'react';
import { useGamificationStore, XP_REWARDS } from '../store/gamificationStore';
import { useAnalyticsStore } from '@mystudyplanner/api-client';
import notificationService from '../services/notificationService';
import { Platform } from 'react-native';

/**
 * Hook to integrate gamification into app actions
 * Call these methods when user performs rewarding actions
 */
export function useGamification() {
  const { addXP, checkAndUnlockBadges, recordPerfectDay, getLevel, xp, unlockedBadges } = useGamificationStore();
  const { progress } = useAnalyticsStore();
  
  /**
   * Call when user completes a study session
   */
  const onSessionComplete = useCallback(async () => {
    // Award XP for completing session
    addXP(XP_REWARDS.complete_session, 'Session terminée');
    
    // Check for new badges after completion
    if (progress) {
      const newBadges = checkAndUnlockBadges({
        sessions: progress.completed_sessions + 1,
        streak: progress.streak,
        courses: progress.active_items,
      });
      
      // Notify about new badges
      if (newBadges.length > 0 && Platform.OS !== 'web') {
        await notificationService.sendImmediateNotification(
          '🏆 Nouveau badge débloqué !',
          `Vous avez débloqué ${newBadges.length} badge(s) !`
        );
      }
      
      return newBadges;
    }
    
    return [];
  }, [addXP, checkAndUnlockBadges, progress]);
  
  /**
   * Call when user maintains their streak
   */
  const onStreakDay = useCallback(() => {
    addXP(XP_REWARDS.streak_day, 'Jour de streak');
  }, [addXP]);
  
  /**
   * Call when user completes all sessions for the day without being late
   */
  const onPerfectDay = useCallback(() => {
    recordPerfectDay();
  }, [recordPerfectDay]);
  
  /**
   * Call when user finishes all reviews for a course
   */
  const onCourseComplete = useCallback(() => {
    addXP(XP_REWARDS.complete_course, 'Cours terminé');
  }, [addXP]);
  
  /**
   * Get current level info
   */
  const getLevelInfo = useCallback(() => {
    return getLevel();
  }, [getLevel]);
  
  /**
   * Check and update badges based on current progress
   */
  const syncBadges = useCallback(() => {
    if (progress) {
      return checkAndUnlockBadges({
        sessions: progress.completed_sessions,
        streak: progress.streak,
        courses: progress.active_items,
      });
    }
    return [];
  }, [checkAndUnlockBadges, progress]);
  
  return {
    // State
    xp,
    unlockedBadges,
    level: getLevel(),
    
    // Actions
    onSessionComplete,
    onStreakDay,
    onPerfectDay,
    onCourseComplete,
    getLevelInfo,
    syncBadges,
  };
}

export default useGamification;
