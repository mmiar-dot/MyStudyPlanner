import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useGamificationStore, BADGES, Badge, calculateLevel } from '../src/store/gamificationStore';
import { useAnalyticsStore } from '@mystudyplanner/api-client';
import { useTheme } from '../src/contexts/ThemeContext';

export default function BadgesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { colors, isDark, accentColor } = useTheme();
  
  const { xp, unlockedBadges, getLevel, getUnlockedBadges, getLockedBadges, checkAndUnlockBadges, perfectDays } = useGamificationStore();
  const { progress, fetchProgress } = useAnalyticsStore();
  
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const [newBadges, setNewBadges] = useState<string[]>([]);
  
  const levelInfo = getLevel();
  const unlockedBadgesList = getUnlockedBadges();
  const lockedBadgesList = getLockedBadges();
  
  useEffect(() => {
    fetchProgress();
  }, []);
  
  useEffect(() => {
    if (progress) {
      const newlyUnlocked = checkAndUnlockBadges({
        sessions: progress.completed_sessions,
        streak: progress.streak,
        courses: progress.active_items,
      });
      if (newlyUnlocked.length > 0) {
        setNewBadges(newlyUnlocked);
      }
    }
  }, [progress]);
  
  const renderBadge = (badge: Badge, isUnlocked: boolean, isNew: boolean = false) => (
    <TouchableOpacity
      key={badge.id}
      style={[
        styles.badgeCard,
        { backgroundColor: colors.surface },
        !isUnlocked && styles.badgeCardLocked,
        isNew && { borderColor: '#FBBF24', borderWidth: 2 },
      ]}
      onPress={() => setSelectedBadge(badge)}
    >
      <View style={[
        styles.badgeIcon,
        { backgroundColor: isUnlocked ? badge.color + '20' : colors.surfaceVariant },
      ]}>
        <Ionicons
          name={badge.icon as any}
          size={32}
          color={isUnlocked ? badge.color : colors.textTertiary}
        />
      </View>
      <Text style={[
        styles.badgeName,
        { color: isUnlocked ? colors.text : colors.textTertiary },
      ]} numberOfLines={1}>
        {badge.name}
      </Text>
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={styles.newBadgeText}>NOUVEAU</Text>
        </View>
      )}
      {!isUnlocked && (
        <View style={styles.lockedOverlay}>
          <Ionicons name="lock-closed" size={20} color={colors.textTertiary} />
        </View>
      )}
    </TouchableOpacity>
  );
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surfaceVariant }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Badges & Niveaux</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={isDesktop && styles.contentDesktop}>
        {/* Level Card */}
        <View style={[styles.levelCard, { backgroundColor: accentColor }]}>
          <View style={styles.levelHeader}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelNumber}>{levelInfo.level}</Text>
            </View>
            <View style={styles.levelInfo}>
              <Text style={styles.levelTitle}>Niveau {levelInfo.level}</Text>
              <Text style={styles.xpText}>{xp} XP total</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${levelInfo.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {Math.round(levelInfo.progress)}% vers niveau {levelInfo.level + 1}
            </Text>
          </View>
        </View>
        
        {/* Stats Summary */}
        <View style={[styles.statsRow, { backgroundColor: colors.surface }]}>
          <View style={styles.statItem}>
            <Ionicons name="trophy" size={24} color={accentColor} />
            <Text style={[styles.statValue, { color: colors.text }]}>{unlockedBadges.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Badges</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="star" size={24} color="#FBBF24" />
            <Text style={[styles.statValue, { color: colors.text }]}>{perfectDays}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Jours parfaits</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#F97316" />
            <Text style={[styles.statValue, { color: colors.text }]}>{progress?.streak || 0}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>
        </View>
        
        {/* Unlocked Badges */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Badges débloqués ({unlockedBadgesList.length})
          </Text>
          <View style={styles.badgesGrid}>
            {unlockedBadgesList.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Continuez à réviser pour débloquer des badges !
              </Text>
            ) : (
              unlockedBadgesList.map((badge) => renderBadge(badge, true, newBadges.includes(badge.id)))
            )}
          </View>
        </View>
        
        {/* Locked Badges */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Badges à débloquer ({lockedBadgesList.length})
          </Text>
          <View style={styles.badgesGrid}>
            {lockedBadgesList.map((badge) => renderBadge(badge, false))}
          </View>
        </View>
      </ScrollView>
      
      {/* Badge Detail Modal */}
      <Modal
        visible={selectedBadge !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedBadge(null)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSelectedBadge(null)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            {selectedBadge && (
              <>
                <View style={[
                  styles.modalBadgeIcon,
                  { backgroundColor: unlockedBadges.includes(selectedBadge.id) ? selectedBadge.color + '20' : colors.surfaceVariant },
                ]}>
                  <Ionicons
                    name={selectedBadge.icon as any}
                    size={48}
                    color={unlockedBadges.includes(selectedBadge.id) ? selectedBadge.color : colors.textTertiary}
                  />
                </View>
                <Text style={[styles.modalBadgeName, { color: colors.text }]}>{selectedBadge.name}</Text>
                <Text style={[styles.modalBadgeDesc, { color: colors.textSecondary }]}>{selectedBadge.description}</Text>
                {!unlockedBadges.includes(selectedBadge.id) && (
                  <View style={[styles.modalRequirement, { backgroundColor: colors.surfaceVariant }]}>
                    <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
                    <Text style={[styles.modalRequirementText, { color: colors.textSecondary }]}>
                      Requis: {selectedBadge.requirement} {selectedBadge.type === 'sessions' ? 'sessions' : selectedBadge.type === 'streak' ? 'jours de streak' : selectedBadge.type === 'courses' ? 'cours' : 'jours parfaits'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.modalCloseBtn, { backgroundColor: accentColor }]}
                  onPress={() => setSelectedBadge(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Fermer</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  contentDesktop: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  levelCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
  },
  levelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  levelBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  levelNumber: { fontSize: 28, fontWeight: '700', color: '#FFFFFF' },
  levelInfo: { flex: 1 },
  levelTitle: { fontSize: 20, fontWeight: '600', color: '#FFFFFF' },
  xpText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  progressContainer: {},
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'right',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, marginHorizontal: 8 },
  statValue: { fontSize: 24, fontWeight: '700', marginTop: 8 },
  statLabel: { fontSize: 12, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: 100,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badgeCardLocked: { opacity: 0.6 },
  badgeIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  newBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  newBadgeText: { fontSize: 8, fontWeight: '700', color: '#FFFFFF' },
  lockedOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  emptyText: { fontStyle: 'italic', padding: 16 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  modalBadgeIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalBadgeName: { fontSize: 24, fontWeight: '700', marginBottom: 8 },
  modalBadgeDesc: { fontSize: 16, textAlign: 'center', marginBottom: 16 },
  modalRequirement: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  modalRequirementText: { fontSize: 14 },
  modalCloseBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 12,
  },
  modalCloseBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
