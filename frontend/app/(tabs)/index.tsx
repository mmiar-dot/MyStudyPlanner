import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSessionStore } from '../../src/store/sessionStore';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import { useAuthStore } from '../../src/store/authStore';
import { SessionCard } from '../../src/components/SessionCard';
import { SRSRatingModal } from '../../src/components/SRSRatingModal';
import { StudySession } from '../../src/types';

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const { user } = useAuthStore();
  const { todaySessions, lateSessions, fetchTodaySessions, fetchLateSessions, completeSession, isLoading } = useSessionStore();
  const { progress, fetchProgress } = useAnalyticsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showLateSessions, setShowLateSessions] = useState(true);
  const [srsSession, setSrsSession] = useState<StudySession | null>(null);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchTodaySessions(),
      fetchLateSessions(),
      fetchProgress(),
    ]);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleCompleteSession = async (session: StudySession) => {
    if (session.method === 'srs') {
      setSrsSession(session);
    } else {
      await completeSession(session.id);
    }
  };

  const handleSRSRating = async (rating: number) => {
    if (srsSession) {
      await completeSession(srsSession.id, rating);
      setSrsSession(null);
    }
  };

  const today = new Date();
  const pendingSessions = todaySessions.filter(s => s.status === 'pending');
  const completedSessions = todaySessions.filter(s => s.status === 'completed');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Desktop Layout */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {/* Left Column - Main Content */}
          <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={[styles.greeting, isDesktop && styles.greetingDesktop]}>
                  Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'}
                </Text>
                <Text style={styles.date}>
                  {format(today, "EEEE d MMMM yyyy", { locale: fr })}
                </Text>
              </View>
              {progress && progress.streak > 0 && (
                <View style={styles.streakBadge}>
                  <Ionicons name="flame" size={20} color="#F97316" />
                  <Text style={styles.streakText}>{progress.streak}</Text>
                </View>
              )}
            </View>

            {/* Late Sessions */}
            {lateSessions.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowLateSessions(!showLateSessions)}
                >
                  <View style={styles.sectionTitleRow}>
                    <Ionicons name="warning" size={20} color="#EF4444" />
                    <Text style={styles.sectionTitleLate}>
                      Retards ({lateSessions.length})
                    </Text>
                  </View>
                  <Ionicons
                    name={showLateSessions ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#6B7280"
                  />
                </TouchableOpacity>

                {showLateSessions && (
                  <View style={[styles.sessionsList, isDesktop && styles.sessionsListDesktop]}>
                    {lateSessions.map((session) => (
                      <View key={session.id} style={isDesktop && styles.sessionCardWrapper}>
                        <SessionCard
                          session={session}
                          onComplete={() => handleCompleteSession(session)}
                          onPress={() => {}}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Today's Sessions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  Sessions du jour ({pendingSessions.length})
                </Text>
              </View>

              {pendingSessions.length === 0 && completedSessions.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={styles.emptyTitle}>Aucune session prévue</Text>
                  <Text style={styles.emptyText}>
                    Ajoutez des cours à réviser depuis l'onglet Cours
                  </Text>
                </View>
              ) : (
                <View style={[styles.sessionsList, isDesktop && styles.sessionsListDesktop]}>
                  {pendingSessions.map((session) => (
                    <View key={session.id} style={isDesktop && styles.sessionCardWrapper}>
                      <SessionCard
                        session={session}
                        onComplete={() => handleCompleteSession(session)}
                        onPress={() => {}}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Completed Today */}
            {completedSessions.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitleCompleted}>
                    Terminées ({completedSessions.length})
                  </Text>
                </View>
                <View style={[styles.sessionsList, isDesktop && styles.sessionsListDesktop]}>
                  {completedSessions.map((session) => (
                    <View key={session.id} style={isDesktop && styles.sessionCardWrapper}>
                      <SessionCard
                        session={session}
                        onComplete={() => {}}
                        onPress={() => {}}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* Right Column - Stats Sidebar (Desktop only) */}
          {isDesktop && (
            <View style={styles.rightColumn}>
              {/* Progress Card */}
              {progress && (
                <View style={styles.progressCardDesktop}>
                  <Text style={styles.progressTitle}>Progression</Text>
                  
                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: '#EBF5FF' }]}>
                        <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                      </View>
                      <View>
                        <Text style={styles.statValue}>{progress.today_completed}</Text>
                        <Text style={styles.statLabel}>Aujourd'hui</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="warning" size={24} color="#EF4444" />
                      </View>
                      <View>
                        <Text style={[styles.statValue, progress.late_sessions > 0 && styles.statValueLate]}>
                          {progress.late_sessions}
                        </Text>
                        <Text style={styles.statLabel}>En retard</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="trending-up" size={24} color="#10B981" />
                      </View>
                      <View>
                        <Text style={styles.statValue}>{progress.completion_rate}%</Text>
                        <Text style={styles.statLabel}>Taux de complétion</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="library" size={24} color="#F59E0B" />
                      </View>
                      <View>
                        <Text style={styles.statValue}>{progress.active_items}</Text>
                        <Text style={styles.statLabel}>Cours actifs</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statRow}>
                    <View style={styles.statItem}>
                      <View style={[styles.statIcon, { backgroundColor: '#FFF7ED' }]}>
                        <Ionicons name="flame" size={24} color="#F97316" />
                      </View>
                      <View>
                        <Text style={styles.statValue}>{progress.streak}</Text>
                        <Text style={styles.statLabel}>Jours de suite</Text>
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* Quick Stats for Total */}
              {progress && (
                <View style={styles.totalCard}>
                  <Text style={styles.totalValue}>{progress.completed_sessions}</Text>
                  <Text style={styles.totalLabel}>Sessions terminées au total</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Mobile Progress Card */}
        {!isDesktop && progress && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{progress.today_completed}</Text>
                <Text style={styles.progressLabel}>Aujourd'hui</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={[styles.progressValue, progress.late_sessions > 0 && styles.progressValueLate]}>
                  {progress.late_sessions}
                </Text>
                <Text style={[styles.progressLabel, progress.late_sessions > 0 && styles.lateLabel]}>
                  En retard
                </Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{progress.completion_rate}%</Text>
                <Text style={styles.progressLabel}>Progression</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* SRS Rating Modal */}
      <SRSRatingModal
        visible={!!srsSession}
        onClose={() => setSrsSession(null)}
        onRate={handleSRSRating}
        itemTitle={srsSession?.item_title || ''}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
  },
  scrollContentDesktop: {
    padding: 40,
  },
  mainContent: {
    flex: 1,
  },
  mainContentDesktop: {
    flexDirection: 'row',
    gap: 32,
    maxWidth: 1400,
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnDesktop: {
    flex: 3,
  },
  rightColumn: {
    width: 320,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  greetingDesktop: {
    fontSize: 32,
  },
  date: {
    fontSize: 16,
    color: '#6B7280',
    textTransform: 'capitalize',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressItem: {
    flex: 1,
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressValueLate: {
    color: '#EF4444',
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  lateLabel: {
    color: '#EF4444',
  },
  progressDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
  },
  // Desktop Sidebar Styles
  progressCardDesktop: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  statRow: {
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  statValueLate: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  totalCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  totalLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionTitleLate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#EF4444',
  },
  sectionTitleCompleted: {
    fontSize: 18,
    fontWeight: '600',
    color: '#10B981',
  },
  sessionsList: {
    gap: 0,
  },
  sessionsListDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  sessionCardWrapper: {
    flex: 1,
    minWidth: 300,
    maxWidth: 400,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
});
