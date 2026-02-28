import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSessionStore } from '../../src/store/sessionStore';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import { SessionCard } from '../../src/components/SessionCard';
import { SRSRatingModal } from '../../src/components/SRSRatingModal';
import { StudySession, CalendarDayData } from '../../src/types';

export default function CalendarScreen() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daySessions, setDaySessions] = useState<StudySession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [srsSession, setSrsSession] = useState<StudySession | null>(null);

  const { fetchSessionsByDate, completeSession } = useSessionStore();
  const { calendarData, fetchCalendarData } = useAnalyticsStore();

  const loadMonthData = useCallback(async () => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();
    await fetchCalendarData(month, year);
  }, [currentMonth]);

  const loadDaySessions = useCallback(async () => {
    const sessions = await fetchSessionsByDate(selectedDate);
    setDaySessions(sessions);
  }, [selectedDate]);

  useEffect(() => {
    loadMonthData();
  }, [currentMonth]);

  useEffect(() => {
    loadDaySessions();
  }, [selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadMonthData(), loadDaySessions()]);
    setRefreshing(false);
  };

  const handleCompleteSession = async (session: StudySession) => {
    if (session.method === 'srs') {
      setSrsSession(session);
    } else {
      await completeSession(session.id);
      await loadDaySessions();
    }
  };

  const handleSRSRating = async (rating: number) => {
    if (srsSession) {
      await completeSession(srsSession.id, rating);
      setSrsSession(null);
      await loadDaySessions();
    }
  };

  // Generate marked dates for calendar
  const markedDates: any = {};
  const today = format(new Date(), 'yyyy-MM-dd');

  Object.entries(calendarData).forEach(([date, data]: [string, CalendarDayData]) => {
    let dotColor = '#3B82F6';
    if (data.late > 0) {
      dotColor = '#EF4444';
    } else if (data.completed === data.total && data.total > 0) {
      dotColor = '#10B981';
    }

    markedDates[date] = {
      marked: true,
      dotColor,
      selected: date === selectedDate,
      selectedColor: date === selectedDate ? '#3B82F6' : undefined,
    };
  });

  // Ensure selected date is always shown
  if (!markedDates[selectedDate]) {
    markedDates[selectedDate] = {
      selected: true,
      selectedColor: '#3B82F6',
    };
  }

  // Mark today
  if (markedDates[today]) {
    markedDates[today] = {
      ...markedDates[today],
      today: true,
    };
  } else {
    markedDates[today] = {
      today: true,
    };
  }

  const pendingSessions = daySessions.filter(s => s.status !== 'completed');
  const completedSessions = daySessions.filter(s => s.status === 'completed');

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
          <Text style={styles.title}>Calendrier</Text>
        </View>

        {/* Calendar */}
        <View style={styles.calendarContainer}>
          <Calendar
            current={format(currentMonth, 'yyyy-MM-dd')}
            onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(month: DateData) => {
              setCurrentMonth(new Date(month.year, month.month - 1));
            }}
            markedDates={markedDates}
            theme={{
              backgroundColor: '#FFFFFF',
              calendarBackground: '#FFFFFF',
              textSectionTitleColor: '#6B7280',
              selectedDayBackgroundColor: '#3B82F6',
              selectedDayTextColor: '#FFFFFF',
              todayTextColor: '#3B82F6',
              dayTextColor: '#1F2937',
              textDisabledColor: '#D1D5DB',
              dotColor: '#3B82F6',
              monthTextColor: '#1F2937',
              arrowColor: '#3B82F6',
              textDayFontWeight: '500',
              textMonthFontWeight: '600',
              textDayHeaderFontWeight: '500',
            }}
            firstDay={1}
          />
        </View>

        {/* Selected Date Sessions */}
        <View style={styles.sessionsSection}>
          <Text style={styles.dateTitle}>
            {format(new Date(selectedDate), "EEEE d MMMM", { locale: fr })}
          </Text>

          {daySessions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
              <Text style={styles.emptyText}>Aucune session ce jour</Text>
            </View>
          ) : (
            <>
              {pendingSessions.length > 0 && (
                <View style={styles.sessionGroup}>
                  <Text style={styles.groupTitle}>
                    À faire ({pendingSessions.length})
                  </Text>
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

              {completedSessions.length > 0 && (
                <View style={styles.sessionGroup}>
                  <Text style={styles.groupTitleCompleted}>
                    Terminées ({completedSessions.length})
                  </Text>
                  {completedSessions.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onComplete={() => {}}
                      onPress={() => {}}
                    />
                  ))}
                </View>
              )}
            </>
          )}
        </View>
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
    paddingBottom: 20,
  },
  header: {
    padding: 20,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  calendarContainer: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionsSection: {
    paddingHorizontal: 20,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  sessionGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 12,
  },
  groupTitleCompleted: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 12,
  },
});
