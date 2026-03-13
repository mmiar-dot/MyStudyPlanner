import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, subDays, isToday, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';

interface Progress {
  todayCompleted: number;
  todayTotal: number;
  lateCount: number;
  totalCompleted: number;
  currentStreak: number;
  maxStreak: number;
  activeCourses: number;
  completionRate: number;
}

interface StatsDetailModalProps {
  visible: boolean;
  onClose: () => void;
  statType: 'today' | 'late' | 'completion' | 'courses' | 'streak';
  progress: Progress;
}

export const StatsDetailModal: React.FC<StatsDetailModalProps> = ({
  visible,
  onClose,
  statType,
  progress,
}) => {
  const [streakData, setStreakData] = useState<Record<string, any>>({});
  const [activeCourses, setActiveCourses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadDetailData();
    }
  }, [visible, statType]);

  const loadDetailData = async () => {
    setIsLoading(true);
    try {
      if (statType === 'streak') {
        // Load streak calendar data for last 3 months
        const today = new Date();
        const marked: Record<string, any> = {};
        
        // Load data for current and previous 2 months
        for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
          const targetDate = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
          const year = targetDate.getFullYear();
          const month = targetDate.getMonth() + 1;
          
          try {
            const response = await api.get(`/analytics/calendar?month=${month}&year=${year}`);
            if (response.data.days) {
              response.data.days.forEach((day: any) => {
                if (day.completed > 0) {
                  marked[day.date] = {
                    selected: true,
                    selectedColor: '#10B981',
                    selectedTextColor: '#FFF',
                  };
                }
              });
            }
          } catch (e) {
            // Ignore errors for individual months
          }
        }
        
        // Mark today specially
        const todayStr = format(today, 'yyyy-MM-dd');
        if (marked[todayStr]) {
          marked[todayStr] = {
            ...marked[todayStr],
            marked: true,
            dotColor: '#FFF',
          };
        }
        
        setStreakData(marked);
      } else if (statType === 'courses' || statType === 'completion') {
        // Load active courses with their names from catalog
        const [settingsRes, catalogRes] = await Promise.all([
          api.get('/user/items/settings'),
          api.get('/catalog/all')
        ]);
        
        const catalog = catalogRes.data;
        const activeCourseSettings = settingsRes.data.filter((s: any) => s.method && s.method !== 'none');
        
        // Map settings to course names
        const coursesWithNames = activeCourseSettings.map((setting: any) => {
          const catalogItem = catalog.find((item: any) => item.id === setting.item_id);
          return {
            ...setting,
            title: catalogItem?.title || 'Cours inconnu',
            level: catalogItem?.level,
          };
        });
        
        setActiveCourses(coursesWithNames);
      }
    } catch (error) {
      console.error('Error loading detail data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getModalContent = () => {
    switch (statType) {
      case 'today':
        return (
          <View style={styles.detailContent}>
            <View style={styles.bigStat}>
              <Text style={styles.bigStatNumber}>{progress.todayCompleted}</Text>
              <Text style={styles.bigStatLabel}>/ {progress.todayTotal} sessions complétées</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBar, 
                  { width: `${progress.todayTotal > 0 ? (progress.todayCompleted / progress.todayTotal) * 100 : 0}%` }
                ]} 
              />
            </View>
            <Text style={styles.detailHint}>
              {progress.todayTotal - progress.todayCompleted > 0
                ? `Il reste ${progress.todayTotal - progress.todayCompleted} session(s) à faire aujourd'hui`
                : progress.todayTotal > 0 
                  ? 'Bravo ! Toutes les sessions du jour sont terminées !'
                  : 'Aucune session prévue aujourd\'hui'}
            </Text>
          </View>
        );

      case 'late':
        return (
          <View style={styles.detailContent}>
            <View style={styles.bigStat}>
              <View style={[styles.bigStatIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="alert-circle" size={32} color="#EF4444" />
              </View>
              <Text style={[styles.bigStatNumber, { color: '#EF4444' }]}>{progress.lateCount}</Text>
              <Text style={styles.bigStatLabel}>sessions en retard</Text>
            </View>
            <Text style={styles.detailHint}>
              {progress.lateCount > 0
                ? 'Ces sessions auraient dû être faites les jours précédents. Rattrapez-les dès que possible !'
                : 'Excellent ! Vous êtes à jour dans vos révisions.'}
            </Text>
          </View>
        );

      case 'completion':
        return (
          <View style={styles.detailContent}>
            <View style={styles.bigStat}>
              <Text style={[styles.bigStatNumber, { color: '#10B981' }]}>{progress.completionRate}%</Text>
              <Text style={styles.bigStatLabel}>taux de complétion global</Text>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatNumber}>{progress.totalCompleted}</Text>
                <Text style={styles.miniStatLabel}>sessions terminées</Text>
              </View>
              <View style={styles.miniStat}>
                <Text style={styles.miniStatNumber}>{progress.activeCourses}</Text>
                <Text style={styles.miniStatLabel}>cours actifs</Text>
              </View>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress.completionRate}%`, backgroundColor: '#10B981' }]} />
            </View>
            
            {/* Detailed breakdown */}
            <View style={styles.breakdownSection}>
              <Text style={styles.breakdownTitle}>Répartition par méthode</Text>
              {isLoading ? (
                <ActivityIndicator color="#3B82F6" size="small" />
              ) : (
                <View style={styles.breakdownList}>
                  {(() => {
                    const jMethod = activeCourses.filter(c => c.method === 'j_method').length;
                    const srs = activeCourses.filter(c => c.method === 'srs').length;
                    const tours = activeCourses.filter(c => c.method === 'tours').length;
                    return (
                      <>
                        <View style={styles.breakdownItem}>
                          <View style={[styles.breakdownDot, { backgroundColor: '#3B82F6' }]} />
                          <Text style={styles.breakdownLabel}>Méthode des J</Text>
                          <Text style={styles.breakdownValue}>{jMethod} cours</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <View style={[styles.breakdownDot, { backgroundColor: '#8B5CF6' }]} />
                          <Text style={styles.breakdownLabel}>SRS (Anki)</Text>
                          <Text style={styles.breakdownValue}>{srs} cours</Text>
                        </View>
                        <View style={styles.breakdownItem}>
                          <View style={[styles.breakdownDot, { backgroundColor: '#10B981' }]} />
                          <Text style={styles.breakdownLabel}>Méthode des Tours</Text>
                          <Text style={styles.breakdownValue}>{tours} cours</Text>
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}
            </View>
          </View>
        );

      case 'courses':
        return (
          <View style={styles.detailContent}>
            <View style={styles.bigStat}>
              <Text style={styles.bigStatNumber}>{progress.activeCourses}</Text>
              <Text style={styles.bigStatLabel}>cours actifs</Text>
            </View>
            {isLoading ? (
              <ActivityIndicator color="#3B82F6" />
            ) : (
              <ScrollView style={styles.coursesList}>
                {activeCourses.length === 0 ? (
                  <Text style={styles.emptyText}>Aucun cours configuré</Text>
                ) : (
                  activeCourses.map((course, index) => (
                    <View key={course.item_id || index} style={styles.courseItem}>
                      <View style={[styles.courseMethod, { 
                        backgroundColor: course.method === 'j_method' ? '#3B82F6' : 
                          course.method === 'srs' ? '#8B5CF6' : '#10B981' 
                      }]}>
                        <Text style={styles.courseMethodText}>
                          {course.method === 'j_method' ? 'J' : 
                            course.method === 'srs' ? 'SRS' : 'T'}
                        </Text>
                      </View>
                      <View style={styles.courseDetails}>
                        <Text style={styles.courseName} numberOfLines={1}>
                          {course.title}
                        </Text>
                        <Text style={styles.courseMethodLabel}>
                          {course.method === 'j_method' ? 'Méthode des J' : 
                            course.method === 'srs' ? 'SRS (Anki-like)' : 'Méthode des Tours'}
                        </Text>
                      </View>
                    </View>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        );

      case 'streak':
        return (
          <View style={styles.detailContent}>
            <View style={styles.streakHeader}>
              <View style={styles.streakInfo}>
                <Text style={styles.streakLabel}>Série actuelle</Text>
                <View style={styles.streakValue}>
                  <Ionicons name="flame" size={28} color="#F59E0B" />
                  <Text style={styles.streakNumber}>{progress.currentStreak}</Text>
                  <Text style={styles.streakDays}>jours</Text>
                </View>
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakLabel}>Record</Text>
                <View style={styles.streakValue}>
                  <Ionicons name="trophy" size={28} color="#3B82F6" />
                  <Text style={styles.streakNumber}>{progress.maxStreak}</Text>
                  <Text style={styles.streakDays}>jours</Text>
                </View>
              </View>
            </View>
            
            {isLoading ? (
              <ActivityIndicator color="#3B82F6" style={{ marginTop: 20 }} />
            ) : (
              <Calendar
                markedDates={streakData}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  selectedDayBackgroundColor: '#10B981',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#3B82F6',
                  todayBackgroundColor: '#EBF5FF',
                  dayTextColor: '#1F2937',
                  textDisabledColor: '#D1D5DB',
                  monthTextColor: '#1F2937',
                  textMonthFontWeight: '600',
                  textDayFontSize: 14,
                  textMonthFontSize: 16,
                }}
                firstDay={1}
              />
            )}
            
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                <Text style={styles.legendText}>Série actuelle</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>Jours passés avec activité</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (statType) {
      case 'today': return 'Sessions du jour';
      case 'late': return 'Sessions en retard';
      case 'completion': return 'Taux de complétion';
      case 'courses': return 'Cours actifs';
      case 'streak': return 'Calendrier des séries';
      default: return 'Détails';
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{getTitle()}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            {getModalContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 16,
  },
  detailContent: {
    alignItems: 'center',
  },
  bigStat: {
    alignItems: 'center',
    marginBottom: 20,
  },
  bigStatIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bigStatNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#3B82F6',
  },
  bigStatLabel: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginVertical: 16,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  detailHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 8,
  },
  miniStat: {
    alignItems: 'center',
  },
  miniStatNumber: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  miniStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  coursesList: {
    maxHeight: 200,
    width: '100%',
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  courseMethod: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courseMethodText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 12,
  },
  courseName: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  moreText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
  },
  streakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  streakInfo: {
    alignItems: 'center',
  },
  streakLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  streakValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
  },
  streakDays: {
    fontSize: 14,
    color: '#6B7280',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  courseDetails: {
    flex: 1,
  },
  courseMethodLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
  breakdownSection: {
    marginTop: 20,
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  breakdownList: {
    gap: 8,
  },
  breakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breakdownDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 13,
    color: '#4B5563',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937',
  },
});
