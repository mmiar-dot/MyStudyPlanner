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
import { Ionicons } from '@expo/vector-icons'
import { format, startOfWeek, addDays, isSameDay, isToday } from 'date-fns';
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
  const { todaySessions, lateSessions, fetchTodaySessions, fetchLateSessions, completeSession, fetchSessionsByDate } = useSessionStore();
  const { progress, fetchProgress, calendarData, fetchCalendarData } = useAnalyticsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showLateSessions, setShowLateSessions] = useState(true);
  const [srsSession, setSrsSession] = useState<StudySession | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState(new Date());
  const [weekSessions, setWeekSessions] = useState<Record<string, StudySession[]>>({});

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchTodaySessions(),
      fetchLateSessions(),
      fetchProgress(),
      fetchCalendarData(today.getMonth() + 1, today.getFullYear()),
    ]);
    
    // Load week sessions for desktop
    if (isDesktop) {
      const sessionsMap: Record<string, StudySession[]> = {};
      for (const day of weekDays) {
        const dateStr = format(day, 'yyyy-MM-dd');
        const sessions = await fetchSessionsByDate(dateStr);
        sessionsMap[dateStr] = sessions;
      }
      setWeekSessions(sessionsMap);
    }
  }, [isDesktop]);

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
      await loadData();
    }
  };

  const handleSRSRating = async (rating: number) => {
    if (srsSession) {
      await completeSession(srsSession.id, rating);
      setSrsSession(null);
      await loadData();
    }
  };

  const pendingSessions = todaySessions.filter(s => s.status === 'pending');
  const completedSessions = todaySessions.filter(s => s.status === 'completed');

  const getWeekDayData = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const data = calendarData[dateStr];
    return {
      sessions: weekSessions[dateStr] || [],
      pending: data?.pending || 0,
      completed: data?.completed || 0,
      late: data?.late || 0,
      total: data?.total || 0,
    };
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, isDesktop && styles.greetingDesktop]}>
              Bonjour, {user?.name?.split(' ')[0] || 'Utilisateur'}
            </Text>
            <Text style={styles.date}>
              {format(today, "EEEE d MMMM yyyy", { locale: fr })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {progress && progress.streak > 0 && (
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={20} color="#F97316" />
                <Text style={styles.streakText}>{progress.streak} jours</Text>
              </View>
            )}
          </View>
        </View>

        {/* Desktop Layout */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {/* Left Column - Sessions */}
          <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
            {/* Late Sessions */}
            {lateSessions.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowLateSessions(!showLateSessions)}
                >
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.lateIcon}>
                      <Ionicons name="warning" size={18} color="#FFFFFF" />
                    </View>
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
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: '#EBF5FF' }]}>
                    <Ionicons name="today" size={18} color="#3B82F6" />
                  </View>
                  <Text style={styles.sectionTitle}>
                    Sessions du jour ({pendingSessions.length})
                  </Text>
                </View>
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
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionIcon, { backgroundColor: '#D1FAE5' }]}>
                      <Ionicons name="checkmark" size={18} color="#10B981" />
                    </View>
                    <Text style={styles.sectionTitleCompleted}>
                      Terminées ({completedSessions.length})
                    </Text>
                  </View>
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
          </View>

          {/* Center Column - Week Calendar (Desktop only) */}
          {isDesktop && (
            <View style={styles.centerColumn}>
              <View style={styles.weekCalendarCard}>
                <Text style={styles.weekCalendarTitle}>Cette semaine</Text>
                
                <View style={styles.weekDays}>
                  {weekDays.map((day) => {
                    const dayData = getWeekDayData(day);
                    const isSelected = isSameDay(day, selectedWeekDay);
                    const isTodayDate = isToday(day);
                    const isPast = day < today && !isTodayDate;
                    
                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.weekDay,
                          isSelected && styles.weekDaySelected,
                          isTodayDate && styles.weekDayToday,
                        ]}
                        onPress={() => setSelectedWeekDay(day)}
                      >
                        <Text style={[
                          styles.weekDayName,
                          isSelected && styles.weekDayTextSelected,
                        ]}>
                          {format(day, 'EEE', { locale: fr })}
                        </Text>
                        <Text style={[
                          styles.weekDayNumber,
                          isSelected && styles.weekDayTextSelected,
                          isTodayDate && !isSelected && styles.weekDayNumberToday,
                        ]}>
                          {format(day, 'd')}
                        </Text>
                        
                        {dayData.total > 0 && (
                          <View style={styles.weekDayIndicators}>
                            {dayData.late > 0 && (
                              <View style={[styles.dayDot, { backgroundColor: '#EF4444' }]} />
                            )}
                            {dayData.pending > 0 && (
                              <View style={[styles.dayDot, { backgroundColor: '#3B82F6' }]} />
                            )}
                            {dayData.completed > 0 && dayData.pending === 0 && dayData.late === 0 && (
                              <View style={[styles.dayDot, { backgroundColor: '#10B981' }]} />
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Selected Day Details */}
                <View style={styles.selectedDayDetails}>
                  <Text style={styles.selectedDayTitle}>
                    {format(selectedWeekDay, "EEEE d MMMM", { locale: fr })}
                  </Text>
                  
                  {(() => {
                    const dayData = getWeekDayData(selectedWeekDay);
                    const daySessions = dayData.sessions;
                    
                    if (daySessions.length === 0) {
                      return (
                        <View style={styles.noDaySessions}>
                          <Ionicons name="calendar-outline" size={24} color="#9CA3AF" />
                          <Text style={styles.noDaySessionsText}>Aucune session</Text>
                        </View>
                      );
                    }
                    
                    return (
                      <View style={styles.daySessionsList}>
                        {daySessions.slice(0, 4).map((session) => (
                          <View key={session.id} style={styles.miniSessionCard}>
                            <View style={[
                              styles.miniSessionDot,
                              { backgroundColor: session.status === 'completed' ? '#10B981' : 
                                session.status === 'late' ? '#EF4444' : '#3B82F6' }
                            ]} />
                            <Text style={styles.miniSessionTitle} numberOfLines={1}>
                              {session.item_title}
                            </Text>
                          </View>
                        ))}
                        {daySessions.length > 4 && (
                          <Text style={styles.moreSessions}>
                            +{daySessions.length - 4} autres
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              </View>
            </View>
          )}

          {/* Right Column - Stats Sidebar */}
          {isDesktop && (
            <View style={styles.rightColumn}>
              {/* Progress Card */}
              {progress && (
                <View style={styles.progressCardDesktop}>
                  <Text style={styles.progressTitle}>Progression</Text>
                  
                  <View style={styles.progressGrid}>
                    <View style={styles.progressGridItem}>
                      <View style={[styles.progressGridIcon, { backgroundColor: '#EBF5FF' }]}>
                        <Ionicons name="checkmark-circle" size={20} color="#3B82F6" />
                      </View>
                      <Text style={styles.progressGridValue}>{progress.today_completed}</Text>
                      <Text style={styles.progressGridLabel}>Aujourd'hui</Text>
                    </View>
                    
                    <View style={styles.progressGridItem}>
                      <View style={[styles.progressGridIcon, { backgroundColor: '#FEF2F2' }]}>
                        <Ionicons name="warning" size={20} color="#EF4444" />
                      </View>
                      <Text style={[styles.progressGridValue, progress.late_sessions > 0 && { color: '#EF4444' }]}>
                        {progress.late_sessions}
                      </Text>
                      <Text style={styles.progressGridLabel}>En retard</Text>
                    </View>
                    
                    <View style={styles.progressGridItem}>
                      <View style={[styles.progressGridIcon, { backgroundColor: '#D1FAE5' }]}>
                        <Ionicons name="trending-up" size={20} color="#10B981" />
                      </View>
                      <Text style={styles.progressGridValue}>{progress.completion_rate}%</Text>
                      <Text style={styles.progressGridLabel}>Complétion</Text>
                    </View>
                    
                    <View style={styles.progressGridItem}>
                      <View style={[styles.progressGridIcon, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="library" size={20} color="#F59E0B" />
                      </View>
                      <Text style={styles.progressGridValue}>{progress.active_items}</Text>
                      <Text style={styles.progressGridLabel}>Cours actifs</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Total Sessions Card */}
              {progress && (
                <View style={styles.totalCard}>
                  <Ionicons name="trophy" size={32} color="#FFFFFF" />
                  <Text style={styles.totalValue}>{progress.completed_sessions}</Text>
                  <Text style={styles.totalLabel}>Sessions terminées</Text>
                </View>
              )}

              {/* Streak Card */}
              {progress && progress.streak > 0 && (
                <View style={styles.streakCard}>
                  <View style={styles.streakCardHeader}>
                    <Ionicons name="flame" size={28} color="#F97316" />
                    <Text style={styles.streakCardValue}>{progress.streak}</Text>
                  </View>
                  <Text style={styles.streakCardLabel}>jours consécutifs</Text>
                  <Text style={styles.streakCardSubtext}>Continuez comme ça !</Text>
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
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    padding: 32,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  headerDesktop: {
    marginBottom: 32,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97316',
  },
  mainContent: {
    flex: 1,
  },
  mainContentDesktop: {
    flexDirection: 'row',
    gap: 24,
  },
  leftColumn: {
    flex: 1,
  },
  leftColumnDesktop: {
    flex: 2,
    maxWidth: 600,
  },
  centerColumn: {
    flex: 2,
    maxWidth: 400,
  },
  rightColumn: {
    width: 280,
    gap: 20,
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
    gap: 10,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lateIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
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
    gap: 12,
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
  // Week Calendar
  weekCalendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekCalendarTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 20,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekDay: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    minWidth: 48,
  },
  weekDaySelected: {
    backgroundColor: '#3B82F6',
  },
  weekDayToday: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  weekDayName: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  weekDayTextSelected: {
    color: '#FFFFFF',
  },
  weekDayNumberToday: {
    color: '#3B82F6',
  },
  weekDayIndicators: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  selectedDayDetails: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  noDaySessions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  noDaySessionsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  daySessionsList: {
    gap: 8,
  },
  miniSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  miniSessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  miniSessionTitle: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  moreSessions: {
    fontSize: 13,
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
  },
  // Progress Card Desktop
  progressCardDesktop: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  progressGridItem: {
    width: '47%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  progressGridIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressGridValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  progressGridLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  totalCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  totalValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  streakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF7ED',
  },
  streakCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakCardValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F97316',
  },
  streakCardLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  streakCardSubtext: {
    fontSize: 13,
    color: '#F97316',
    marginTop: 8,
    fontWeight: '500',
  },
  // Mobile Progress Card
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
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
});
