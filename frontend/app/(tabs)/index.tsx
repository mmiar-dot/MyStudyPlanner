import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'}</Text>
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

        {/* Progress Card */}
        {progress && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{progress.today_completed}</Text>
                <Text style={styles.progressLabel}>Aujourd'hui</Text>
              </View>
              <View style={styles.progressDivider} />
              <View style={styles.progressItem}>
                <Text style={styles.progressValue}>{progress.late_sessions}</Text>
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
              <View style={styles.sessionsList}>
                {lateSessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    onComplete={() => handleCompleteSession(session)}
                    onPress={() => {}}
                  />
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
            <View style={styles.sessionsList}>
              {pendingSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onComplete={() => handleCompleteSession(session)}
                  onPress={() => {}}
                />
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
            <View style={styles.sessionsList}>
              {completedSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  onComplete={() => {}}
                  onPress={() => {}}
                />
              ))}
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
    marginBottom: 24,
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
