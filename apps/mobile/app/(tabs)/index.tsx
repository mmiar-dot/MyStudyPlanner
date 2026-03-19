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
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay, isToday, isSameWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSessionStore } from '@mystudyplanner/api-client';
import { useAnalyticsStore } from '@mystudyplanner/api-client';
import { useAuthStore } from '../../src/store/authStore';
import { setSessionRefreshCallback, setCalendarRefreshCallback } from '@mystudyplanner/api-client';
import { SessionCard } from '@mystudyplanner/shared-ui';
import { SRSRatingModal } from '@mystudyplanner/shared-ui';
import { StatsDetailModal } from '@mystudyplanner/shared-ui';
import { StudySession } from '@mystudyplanner/api-client';
import { useTheme } from '../../src/contexts/ThemeContext';

export default function TodayScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { colors, isDark, accentColor } = useTheme();
  
  const { user } = useAuthStore();
  const { todaySessions, lateSessions, fetchTodaySessions, fetchLateSessions, completeSession, fetchSessionsByDate } = useSessionStore();
  const { progress, fetchProgress, calendarData, fetchCalendarData } = useAnalyticsStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showLateSessions, setShowLateSessions] = useState(true);
  const [srsSession, setSrsSession] = useState<StudySession | null>(null);
  const [selectedWeekDay, setSelectedWeekDay] = useState(new Date());
  const [weekSessions, setWeekSessions] = useState<Record<string, StudySession[]>>({});
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [statsType, setStatsType] = useState<'today' | 'late' | 'completion' | 'courses' | 'streak'>('today');

  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const isCurrentWeek = isSameWeek(currentWeekStart, today, { weekStartsOn: 1 });

  // Week navigation
  const goToPreviousWeek = () => {
    const newWeekStart = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
    setSelectedWeekDay(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
    setSelectedWeekDay(newWeekStart);
  };

  const goToCurrentWeek = () => {
    const newWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    setCurrentWeekStart(newWeekStart);
    setSelectedWeekDay(today);
  };

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchTodaySessions(),
      fetchLateSessions(),
      fetchProgress(),
      fetchCalendarData(today.getMonth() + 1, today.getFullYear()),
    ]);
    
    // Load week sessions
    await loadWeekSessions();
  }, [isDesktop, currentWeekStart]);

  const loadWeekSessions = async () => {
    const sessionsMap: Record<string, StudySession[]> = {};
    for (const day of weekDays) {
      const dateStr = format(day, 'yyyy-MM-dd');
      const sessions = await fetchSessionsByDate(dateStr);
      sessionsMap[dateStr] = sessions;
    }
    setWeekSessions(sessionsMap);
  };

  // Setup callbacks for session refresh when courses are added/updated
  useEffect(() => {
    setSessionRefreshCallback(async () => {
      await fetchTodaySessions();
      await fetchLateSessions();
    });
    setCalendarRefreshCallback(async (month: number, year: number) => {
      await fetchCalendarData(month, year);
    });
  }, [fetchTodaySessions, fetchLateSessions, fetchCalendarData]);

  useEffect(() => {
    loadData();
  }, []);

  // Reload week sessions when week changes
  useEffect(() => {
    loadWeekSessions();
    // Also fetch calendar data for the relevant month if needed
    const weekMonth = currentWeekStart.getMonth() + 1;
    const weekYear = currentWeekStart.getFullYear();
    fetchCalendarData(weekMonth, weekYear);
  }, [currentWeekStart]);

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

  const pendingSessions = (todaySessions || []).filter(s => s.status === 'pending');
  const completedSessions = (todaySessions || []).filter(s => s.status === 'completed');

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accentColor]} />
        }
      >
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View style={styles.headerLeft}>
            <Text style={[styles.greeting, isDesktop && styles.greetingDesktop, { color: colors.text }]}>
              Bonjour, {(user?.name?.trim() ? user.name.split(' ')[0] : user?.email?.split('@')[0]) || 'Utilisateur'}
            </Text>
            <Text style={[styles.date, { color: colors.textSecondary }]}>
              {format(today, "EEEE d MMMM yyyy", { locale: fr })}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {progress && progress.streak > 0 && (
              <View style={[styles.streakBadge, { backgroundColor: isDark ? '#422006' : '#FFF7ED' }]}>
                <Ionicons name="flame" size={20} color="#F97316" />
                <Text style={styles.streakText}>{progress.streak} jours</Text>
              </View>
            )}
          </View>
        </View>

        {/* Desktop Layout */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {/* Desktop: Week Calendar on LEFT (enlarged) */}
          {isDesktop && (
            <View style={styles.weekCalendarColumnDesktop}>
              <View style={[styles.weekCalendarCardDesktop, { backgroundColor: colors.surface }]}>
                {/* Week Navigation Header */}
                <View style={styles.weekNavHeader}>
                  <TouchableOpacity 
                    style={[styles.weekNavButton, { backgroundColor: isDark ? colors.primaryLight : '#EBF5FF' }]}
                    onPress={goToPreviousWeek}
                  >
                    <Ionicons name="chevron-back" size={20} color={accentColor} />
                  </TouchableOpacity>
                  
                  <View style={styles.weekNavCenter}>
                    <Text style={[styles.weekCalendarTitle, { color: colors.text }]}>
                      {isCurrentWeek 
                        ? 'Cette semaine' 
                        : `Semaine du ${format(currentWeekStart, 'd MMM', { locale: fr })}`}
                    </Text>
                    {!isCurrentWeek && (
                      <TouchableOpacity onPress={goToCurrentWeek}>
                        <Text style={[styles.backToTodayText, { color: accentColor }]}>Revenir à aujourd'hui</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  <TouchableOpacity 
                    style={[styles.weekNavButton, { backgroundColor: isDark ? colors.primaryLight : '#EBF5FF' }]}
                    onPress={goToNextWeek}
                  >
                    <Ionicons name="chevron-forward" size={20} color={accentColor} />
                  </TouchableOpacity>
                </View>
                
                {/* Week Days - Enlarged */}
                <View style={styles.weekDaysDesktop}>
                  {weekDays.map((day) => {
                    const dayData = getWeekDayData(day);
                    const isSelected = isSameDay(day, selectedWeekDay);
                    const isTodayDate = isToday(day);
                    const daySessions = dayData.sessions;
                    
                    return (
                      <TouchableOpacity
                        key={day.toISOString()}
                        style={[
                          styles.weekDayColumnDesktop,
                          { backgroundColor: colors.surfaceVariant },
                          isSelected && [styles.weekDayColumnSelected, { backgroundColor: accentColor }],
                          isTodayDate && !isSelected && { borderColor: accentColor },
                        ]}
                        onPress={() => setSelectedWeekDay(day)}
                      >
                        <Text style={[
                          styles.weekDayNameDesktop,
                          { color: colors.textSecondary },
                          isSelected && styles.weekDayTextSelected,
                        ]}>
                          {format(day, 'EEEE', { locale: fr })}
                        </Text>
                        <Text style={[
                          styles.weekDayNumberDesktop,
                          { color: colors.textTertiary },
                          isSelected && styles.weekDayTextSelected,
                          isTodayDate && !isSelected && { color: accentColor },
                        ]}>
                          {format(day, 'd MMM', { locale: fr })}
                        </Text>
                        
                        {/* Mini sessions list */}
                        <View style={styles.weekDaySessionsDesktop}>
                          {daySessions.length === 0 ? (
                            <Text style={[styles.noSessionsText, { color: colors.textTertiary }, isSelected && { color: 'rgba(255,255,255,0.7)' }]}>
                              Aucune session
                            </Text>
                          ) : (
                            <>
                              {daySessions.slice(0, 5).map((session) => (
                                <View key={session.id} style={[
                                  styles.weekDaySessionItem,
                                  { backgroundColor: colors.surface },
                                  isSelected && styles.weekDaySessionItemSelected
                                ]}>
                                  <View style={[
                                    styles.weekDaySessionDot,
                                    { backgroundColor: session.status === 'completed' ? '#10B981' : 
                                      session.status === 'late' ? '#EF4444' : accentColor }
                                  ]} />
                                  <Text style={[
                                    styles.weekDaySessionTitle,
                                    { color: colors.text },
                                    isSelected && styles.weekDaySessionTitleSelected
                                  ]} numberOfLines={1}>
                                    {session.item_title}
                                  </Text>
                                </View>
                              ))}
                              {daySessions.length > 5 && (
                                <Text style={[styles.moreSessionsDesktop, { color: accentColor }, isSelected && { color: 'rgba(255,255,255,0.8)' }]}>
                                  +{daySessions.length - 5} autres
                                </Text>
                              )}
                            </>
                          )}
                        </View>
                        
                        {/* Day summary badges */}
                        <View style={styles.weekDaySummary}>
                          {dayData.pending > 0 && (
                            <View style={[styles.summaryBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : colors.primaryLight }]}>
                              <Text style={[styles.summaryBadgeText, { color: accentColor }, isSelected && { color: '#FFFFFF' }]}>
                                {dayData.pending} à faire
                              </Text>
                            </View>
                          )}
                          {dayData.completed > 0 && (
                            <View style={[styles.summaryBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : (isDark ? '#064E3B' : '#D1FAE5') }]}>
                              <Text style={[styles.summaryBadgeText, isSelected && { color: '#FFFFFF' }, !isSelected && { color: '#10B981' }]}>
                                {dayData.completed} terminées
                              </Text>
                            </View>
                          )}
                          {dayData.late > 0 && (
                            <View style={[styles.summaryBadge, { backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : (isDark ? '#7F1D1D' : '#FEF2F2') }]}>
                              <Text style={[styles.summaryBadgeText, isSelected && { color: '#FFFFFF' }, !isSelected && { color: '#EF4444' }]}>
                                {dayData.late} en retard
                              </Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Desktop Stats Section - Under Week Calendar */}
              {progress && (
                <View style={[styles.desktopStatsSectionUnderCalendar, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.desktopStatsSectionTitle, { color: colors.text }]}>Statistiques</Text>
                  <View style={styles.desktopStatsRowCompact}>
                    <TouchableOpacity 
                      style={[styles.desktopStatCardCompact, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => {
                        setStatsType('today');
                        setShowStatsModal(true);
                      }}
                    >
                      <View style={[styles.desktopStatIconSmall, { backgroundColor: colors.primaryLight }]}>
                        <Ionicons name="checkmark-circle" size={20} color={accentColor} />
                      </View>
                      <View style={styles.desktopStatInfo}>
                        <Text style={[styles.desktopStatValueCompact, { color: colors.text }]}>{progress.today_completed}</Text>
                        <Text style={[styles.desktopStatLabelCompact, { color: colors.textSecondary }]}>Aujourd'hui</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.desktopStatCardCompact, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => {
                        setStatsType('late');
                        setShowStatsModal(true);
                      }}
                    >
                      <View style={[styles.desktopStatIconSmall, { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2' }]}>
                        <Ionicons name="warning" size={20} color="#EF4444" />
                      </View>
                      <View style={styles.desktopStatInfo}>
                        <Text style={[styles.desktopStatValueCompact, { color: colors.text }, progress.late_sessions > 0 && { color: '#EF4444' }]}>
                          {progress.late_sessions}
                        </Text>
                        <Text style={[styles.desktopStatLabelCompact, { color: colors.textSecondary }]}>En retard</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.desktopStatCardCompact, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => {
                        setStatsType('completion');
                        setShowStatsModal(true);
                      }}
                    >
                      <View style={[styles.desktopStatIconSmall, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                        <Ionicons name="trending-up" size={20} color="#10B981" />
                      </View>
                      <View style={styles.desktopStatInfo}>
                        <Text style={[styles.desktopStatValueCompact, { color: colors.text }]}>{progress.completion_rate}%</Text>
                        <Text style={[styles.desktopStatLabelCompact, { color: colors.textSecondary }]}>Complétion</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.desktopStatCardCompact, { backgroundColor: colors.surfaceVariant }]}
                      onPress={() => {
                        setStatsType('courses');
                        setShowStatsModal(true);
                      }}
                    >
                      <View style={[styles.desktopStatIconSmall, { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }]}>
                        <Ionicons name="library" size={20} color="#F59E0B" />
                      </View>
                      <View style={styles.desktopStatInfo}>
                        <Text style={[styles.desktopStatValueCompact, { color: colors.text }]}>{progress.active_items}</Text>
                        <Text style={[styles.desktopStatLabelCompact, { color: colors.textSecondary }]}>Cours actifs</Text>
                      </View>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.desktopStatCardCompact, { backgroundColor: accentColor }]}
                      onPress={() => {
                        setStatsType('completion');
                        setShowStatsModal(true);
                      }}
                    >
                      <Ionicons name="trophy" size={20} color="#FFFFFF" />
                      <View style={styles.desktopStatInfo}>
                        <Text style={[styles.desktopStatValueCompact, { color: '#FFFFFF' }]}>{progress.completed_sessions}</Text>
                        <Text style={[styles.desktopStatLabelCompact, { color: 'rgba(255,255,255,0.9)' }]}>Total terminées</Text>
                      </View>
                    </TouchableOpacity>
                    
                    {progress.streak > 0 && (
                      <TouchableOpacity 
                        style={[styles.desktopStatCardCompact, styles.desktopStreakCardCompact, { backgroundColor: isDark ? '#422006' : '#FFF7ED' }]}
                        onPress={() => {
                          setStatsType('streak');
                          setShowStatsModal(true);
                        }}
                      >
                        <Ionicons name="flame" size={20} color="#F97316" />
                        <View style={styles.desktopStatInfo}>
                          <Text style={[styles.desktopStatValueCompact, { color: '#F97316' }]}>{progress.streak}</Text>
                          <Text style={[styles.desktopStatLabelCompact, { color: colors.textSecondary }]}>jours</Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Sessions Column (center on desktop) */}
          <View style={[styles.leftColumn, isDesktop && styles.sessionsColumnDesktop]}>
            {/* Late Sessions */}
            {(lateSessions || []).length > 0 && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <TouchableOpacity
                  style={styles.sectionHeader}
                  onPress={() => setShowLateSessions(!showLateSessions)}
                >
                  <View style={styles.sectionTitleRow}>
                    <View style={styles.lateIcon}>
                      <Ionicons name="warning" size={18} color="#FFFFFF" />
                    </View>
                    <Text style={styles.sectionTitleLate}>
                      Retards ({(lateSessions || []).length})
                    </Text>
                  </View>
                  <Ionicons
                    name={showLateSessions ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>

                {showLateSessions && (
                  <View style={styles.sessionsList}>
                    {(lateSessions || []).map((session) => (
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
            <View style={[styles.sessionsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <View style={[styles.sectionIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="today" size={18} color={accentColor} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.text }]}>
                    Sessions du jour ({pendingSessions.length})
                  </Text>
                </View>
              </View>

              {pendingSessions.length === 0 && completedSessions.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: isDark ? colors.surfaceVariant : colors.surfaceVariant }]}>
                  <View style={[styles.emptyIconContainer, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                    <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>Aucune session prévue</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
                      onStatusChange={loadData}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Completed Today */}
            {completedSessions.length > 0 && (
              <View style={[styles.sessionsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <View style={styles.sectionHeader}>
                  <View style={styles.sectionTitleRow}>
                    <View style={[styles.sectionIcon, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }]}>
                      <Ionicons name="checkmark" size={18} color="#10B981" />
                    </View>
                    <Text style={[styles.sectionTitle, { color: colors.success }]}>
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
                      onStatusChange={loadData}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Mobile Progress Card */}
        {!isDesktop && progress && (
          <View style={styles.progressCard}>
            <View style={styles.progressRow}>
              <TouchableOpacity 
                style={styles.progressItem}
                onPress={() => {
                  setStatsType('today');
                  setShowStatsModal(true);
                }}
              >
                <Text style={styles.progressValue}>{progress.today_completed}</Text>
                <Text style={styles.progressLabel}>Aujourd'hui</Text>
              </TouchableOpacity>
              <View style={styles.progressDivider} />
              <TouchableOpacity 
                style={styles.progressItem}
                onPress={() => {
                  setStatsType('late');
                  setShowStatsModal(true);
                }}
              >
                <Text style={[styles.progressValue, progress.late_sessions > 0 && styles.progressValueLate]}>
                  {progress.late_sessions}
                </Text>
                <Text style={[styles.progressLabel, progress.late_sessions > 0 && styles.lateLabel]}>
                  En retard
                </Text>
              </TouchableOpacity>
              <View style={styles.progressDivider} />
              <TouchableOpacity 
                style={styles.progressItem}
                onPress={() => {
                  setStatsType('completion');
                  setShowStatsModal(true);
                }}
              >
                <Text style={styles.progressValue}>{progress.completion_rate}%</Text>
                <Text style={styles.progressLabel}>Progression</Text>
              </TouchableOpacity>
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

      {/* Stats Detail Modal */}
      <StatsDetailModal
        visible={showStatsModal}
        onClose={() => setShowStatsModal(false)}
        statType={statsType}
        progress={{
          todayCompleted: progress?.today_completed || 0,
          todayTotal: (todaySessions || []).length,
          lateCount: progress?.late_sessions || 0,
          totalCompleted: progress?.completed_sessions || 0,
          currentStreak: progress?.streak || 0,
          maxStreak: progress?.max_streak || progress?.streak || 0,
          activeCourses: progress?.active_items || 0,
          completionRate: progress?.completion_rate || 0,
        }}
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
  sessionsCard: {
    marginBottom: 24,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
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
    padding: 32,
    borderRadius: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  // Week Calendar
  weekCalendarCard: {
    borderRadius: 16,
    padding: 20,
  },
  weekNavHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  weekNavCenter: {
    flex: 1,
    alignItems: 'center',
  },
  weekCalendarTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  backToTodayText: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
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
  },
  weekDayName: {
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  weekDayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  weekDayTextSelected: {
    color: '#FFFFFF',
  },
  weekDayNumberToday: {
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
    paddingTop: 16,
  },
  selectedDayTitle: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
    marginBottom: 12,
  },
  noDaySessions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 8,
  },
  noDaySessionsText: {
    fontSize: 14,
  },
  daySessionsList: {
    gap: 8,
  },
  miniSessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
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
  },
  moreSessions: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  // Progress Card Desktop
  progressCardDesktop: {
    borderRadius: 16,
    padding: 20,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
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
  },
  progressGridLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  totalCard: {
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
  // NEW Desktop Layout Styles
  weekCalendarColumnDesktop: {
    flex: 3,
    minWidth: 500,
  },
  weekCalendarCardDesktop: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  weekDaysDesktop: {
    flexDirection: 'row',
    gap: 12,
  },
  weekDayColumnDesktop: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    minHeight: 280,
  },
  weekDayColumnSelected: {
    backgroundColor: '#3B82F6',
  },
  weekDayColumnToday: {
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  weekDayNameDesktop: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  weekDayNumberDesktop: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
    textTransform: 'capitalize',
  },
  weekDaySessionsDesktop: {
    flex: 1,
    gap: 6,
  },
  noSessionsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  weekDaySessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  weekDaySessionItemSelected: {
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  weekDaySessionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekDaySessionTitle: {
    flex: 1,
    fontSize: 12,
    color: '#374151',
  },
  weekDaySessionTitleSelected: {
    color: '#FFFFFF',
  },
  moreSessionsDesktop: {
    fontSize: 11,
    color: '#3B82F6',
    textAlign: 'center',
    marginTop: 4,
  },
  weekDaySummary: {
    marginTop: 'auto',
    paddingTop: 12,
    gap: 4,
  },
  summaryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#3B82F6',
  },
  sessionsColumnDesktop: {
    flex: 2,
    maxWidth: 450,
  },
  // Desktop Stats Section (Bottom)
  desktopStatsSection: {
    marginTop: 32,
  },
  desktopStatsSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  desktopStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  desktopStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    minWidth: 140,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopStatIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  desktopStatValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  desktopStatLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  desktopStreakCard: {
    borderWidth: 2,
    borderColor: '#FFF7ED',
  },
  // Stats under calendar - Compact version
  desktopStatsSectionUnderCalendar: {
    marginTop: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  desktopStatsRowCompact: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  desktopStatCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    minWidth: 130,
    flex: 1,
  },
  desktopStatIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopStatInfo: {
    flex: 1,
  },
  desktopStatValueCompact: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  desktopStatLabelCompact: {
    fontSize: 11,
    color: '#6B7280',
  },
  desktopStreakCardCompact: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
});
