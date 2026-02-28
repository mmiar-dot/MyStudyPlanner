import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { StudySession } from '../types';
import { useSessionStore } from '../store/sessionStore';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';

interface SessionCardProps {
  session: StudySession;
  onComplete: (session: StudySession) => void;
  onSkip?: (session: StudySession) => void;
  showActions?: boolean;
  onStatusChange?: () => void; // Called when session status changes (uncomplete, reschedule, etc.)
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onComplete,
  onSkip,
  showActions = true,
  onStatusChange,
}) => {
  const { uncompleteSession, rescheduleSession, courseNotes, fetchCourseNotes, addCourseNote } = useSessionStore();
  
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(session.scheduled_date);
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);

  const notes = courseNotes[session.item_id] || [];

  useEffect(() => {
    // Fetch notes when the component mounts
    if (session.item_id) {
      fetchCourseNotes(session.item_id);
    }
  }, [session.item_id]);

  // Fetch upcoming sessions for this item when modal opens
  const fetchUpcomingSessions = async () => {
    try {
      const response = await api.get<StudySession[]>(`/sessions/item/${session.item_id}`);
      setUpcomingSessions(response.data.sort((a, b) => 
        new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime()
      ));
    } catch (error) {
      console.error('Error fetching upcoming sessions:', error);
    }
  };

  const isCompleted = session.status === 'completed';
  const isLate = session.status === 'late';
  const isSkipped = session.status === 'skipped';

  const getMethodLabel = () => {
    if (session.method === 'j_method' && session.j_day !== undefined) {
      return `J${session.j_day}`;
    }
    if (session.method === 'srs') {
      return 'SRS';
    }
    if (session.method === 'tours' && session.tour_number) {
      return `Tour ${session.tour_number}`;
    }
    return session.method;
  };

  const getStatusColor = () => {
    if (isCompleted) return '#10B981';
    if (isLate) return '#EF4444';
    if (isSkipped) return '#9CA3AF';
    return '#3B82F6';
  };

  const handleUncomplete = async () => {
    try {
      setIsLoading(true);
      await uncompleteSession(session.id);
      // Force close modal immediately for better UX
      setShowOptionsModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'annuler la complétion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReschedule = async () => {
    if (!selectedDate) return;
    try {
      setIsLoading(true);
      await rescheduleSession(session.id, selectedDate);
      setShowRescheduleModal(false);
      setShowOptionsModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de déplacer la session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return;
    try {
      setIsLoading(true);
      await addCourseNote(session.item_id, newNoteContent.trim());
      setNewNoteContent('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter la note');
    } finally {
      setIsLoading(false);
    }
  };

  const quickDates = [
    { label: 'Demain', date: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'Dans 2 jours', date: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: 'Dans 1 semaine', date: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

  return (
    <>
      <TouchableOpacity 
        style={[styles.card, isCompleted && styles.cardCompleted, isLate && styles.cardLate]}
        onPress={() => setShowOptionsModal(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.methodBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.methodText}>{getMethodLabel()}</Text>
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.title, isCompleted && styles.titleCompleted]} numberOfLines={2}>
            {session.item_title}
          </Text>
          
          {/* Show notes indicator */}
          {notes.length > 0 && (
            <View style={styles.notesIndicator}>
              <Ionicons name="document-text" size={12} color="#F59E0B" />
              <Text style={styles.notesCount}>{notes.length} note(s)</Text>
            </View>
          )}
          
          {session.scheduled_time && (
            <Text style={styles.time}>
              <Ionicons name="time-outline" size={12} /> {session.scheduled_time}
            </Text>
          )}
        </View>

        {showActions && !isCompleted && !isSkipped && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={(e) => {
              e.stopPropagation();
              onComplete(session);
            }}
          >
            <Ionicons name="ellipse-outline" size={32} color={isLate ? '#EF4444' : '#3B82F6'} />
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark-circle" size={28} color="#10B981" />
          </View>
        )}
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{session.item_title}</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.sessionInfo}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>
                  {isCompleted ? 'Terminée' : isLate ? 'En retard' : isSkipped ? 'Ignorée' : 'En attente'}
                </Text>
              </View>
              <Text style={styles.sessionDate}>
                Planifiée le {format(new Date(session.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
              </Text>
            </View>

            {/* Course Notes Section */}
            <View style={styles.notesSection}>
              <View style={styles.notesSectionHeader}>
                <Ionicons name="document-text-outline" size={18} color="#F59E0B" />
                <Text style={styles.notesSectionTitle}>Notes du cours</Text>
              </View>
              
              {notes.length > 0 ? (
                <ScrollView style={styles.notesList} nestedScrollEnabled>
                  {notes.map((note) => (
                    <View key={note.id} style={styles.noteItem}>
                      <Text style={styles.noteContent}>{note.content}</Text>
                      <Text style={styles.noteDate}>
                        {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.noNotes}>Aucune note pour ce cours</Text>
              )}

              <View style={styles.addNoteRow}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Ajouter une note..."
                  placeholderTextColor="#9CA3AF"
                  value={newNoteContent}
                  onChangeText={setNewNoteContent}
                  multiline
                />
                <TouchableOpacity 
                  style={styles.addNoteButton}
                  onPress={handleAddNote}
                  disabled={!newNoteContent.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#3B82F6" />
                  ) : (
                    <Ionicons name="add-circle" size={28} color="#3B82F6" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {!isCompleted && !isSkipped && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowOptionsModal(false);
                    onComplete(session);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={[styles.actionText, { color: '#10B981' }]}>Terminer</Text>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleUncomplete}
                  disabled={isLoading}
                >
                  <Ionicons name="refresh" size={20} color="#F59E0B" />
                  <Text style={[styles.actionText, { color: '#F59E0B' }]}>Annuler</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => setShowRescheduleModal(true)}
              >
                <Ionicons name="calendar" size={20} color="#3B82F6" />
                <Text style={[styles.actionText, { color: '#3B82F6' }]}>Déplacer</Text>
              </TouchableOpacity>

              {!isCompleted && !isSkipped && onSkip && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowOptionsModal(false);
                    onSkip(session);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                  <Text style={[styles.actionText, { color: '#9CA3AF' }]}>Ignorer</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.rescheduleModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Déplacer la session</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.rescheduleLabel}>Dates rapides :</Text>

            <View style={styles.quickDates}>
              {quickDates.map((qd) => (
                <TouchableOpacity
                  key={qd.date}
                  style={[styles.quickDateButton, selectedDate === qd.date && styles.quickDateSelected]}
                  onPress={() => setSelectedDate(qd.date)}
                >
                  <Text style={[styles.quickDateText, selectedDate === qd.date && styles.quickDateTextSelected]}>
                    {qd.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.rescheduleLabel}>Ou choisir une date :</Text>
            
            <TouchableOpacity 
              style={styles.calendarToggle}
              onPress={() => setShowCalendarPicker(!showCalendarPicker)}
            >
              <Ionicons name="calendar" size={20} color="#3B82F6" />
              <Text style={styles.calendarToggleText}>
                {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
              </Text>
              <Ionicons name={showCalendarPicker ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
            </TouchableOpacity>

            {showCalendarPicker && (
              <View style={styles.calendarContainer}>
                <Calendar
                  current={selectedDate}
                  onDayPress={(day: any) => {
                    setSelectedDate(day.dateString);
                    setShowCalendarPicker(false);
                  }}
                  markedDates={{
                    [selectedDate]: { selected: true, selectedColor: '#3B82F6' },
                    [session.scheduled_date]: { marked: true, dotColor: '#EF4444' }
                  }}
                  minDate={format(new Date(), 'yyyy-MM-dd')}
                  theme={{
                    todayTextColor: '#3B82F6',
                    selectedDayBackgroundColor: '#3B82F6',
                    arrowColor: '#3B82F6',
                  }}
                />
              </View>
            )}

            <TouchableOpacity
              style={[styles.rescheduleButton, isLoading && styles.buttonDisabled]}
              onPress={handleReschedule}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.rescheduleButtonText}>Confirmer</Text>
              )}
            </TouchableOpacity>

            {/* View upcoming sessions */}
            <TouchableOpacity
              style={styles.viewUpcomingButton}
              onPress={() => {
                fetchUpcomingSessions();
                setShowUpcomingModal(true);
              }}
            >
              <Ionicons name="list" size={18} color="#3B82F6" />
              <Text style={styles.viewUpcomingText}>Voir toutes les sessions de ce cours</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Upcoming Sessions Modal */}
      <Modal visible={showUpcomingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.upcomingModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Sessions planifiées</Text>
              <TouchableOpacity onPress={() => setShowUpcomingModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.upcomingSubtitle}>{session.item_title}</Text>

            <ScrollView style={styles.upcomingList}>
              {upcomingSessions.map((s, idx) => {
                const isPast = new Date(s.scheduled_date) < new Date();
                const isCurrent = s.id === session.id;
                
                return (
                  <View 
                    key={s.id} 
                    style={[
                      styles.upcomingItem,
                      s.status === 'completed' && styles.upcomingItemCompleted,
                      isCurrent && styles.upcomingItemCurrent
                    ]}
                  >
                    <View style={[
                      styles.upcomingDot,
                      { backgroundColor: s.status === 'completed' ? '#10B981' : isPast ? '#EF4444' : '#3B82F6' }
                    ]} />
                    <View style={styles.upcomingInfo}>
                      <Text style={styles.upcomingLabel}>
                        {s.j_day !== undefined ? `J${s.j_day}` : s.tour_number ? `Tour ${s.tour_number}` : 'SRS'}
                        {isCurrent && ' (actuel)'}
                      </Text>
                      <Text style={styles.upcomingDate}>
                        {format(new Date(s.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
                      </Text>
                    </View>
                    <View style={styles.upcomingStatus}>
                      {s.status === 'completed' ? (
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      ) : s.status === 'skipped' ? (
                        <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                      ) : isPast ? (
                        <Text style={styles.upcomingLateText}>En retard</Text>
                      ) : (
                        <TouchableOpacity
                          onPress={async () => {
                            await rescheduleSession(s.id, format(addDays(new Date(s.scheduled_date), 1), 'yyyy-MM-dd'));
                            fetchUpcomingSessions();
                          }}
                        >
                          <Ionicons name="arrow-forward" size={20} color="#6B7280" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardCompleted: {
    backgroundColor: '#F0FDF4',
    opacity: 0.8,
  },
  cardLate: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
  },
  methodText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  notesIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  notesCount: {
    fontSize: 11,
    color: '#F59E0B',
  },
  time: {
    fontSize: 12,
    color: '#6B7280',
  },
  completeButton: {
    padding: 4,
  },
  completedIcon: {
    opacity: 0.7,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  sessionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  sessionDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  notesSection: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
  },
  notesSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  notesSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
  },
  notesList: {
    maxHeight: 150,
  },
  noteItem: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  noteContent: {
    fontSize: 14,
    color: '#374151',
  },
  noteDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  noNotes: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
  },
  addNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 10,
  },
  noteInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    maxHeight: 80,
  },
  addNoteButton: {
    padding: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 16,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
    padding: 10,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  // Reschedule modal
  rescheduleModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    margin: 20,
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  rescheduleLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  quickDates: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickDateButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    alignItems: 'center',
  },
  quickDateSelected: {
    backgroundColor: '#3B82F6',
  },
  quickDateText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  quickDateTextSelected: {
    color: '#FFFFFF',
  },
  dateInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  rescheduleButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  rescheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  calendarToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  calendarToggleText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  calendarContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  viewUpcomingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    gap: 8,
  },
  viewUpcomingText: {
    fontSize: 14,
    color: '#3B82F6',
  },
  // Upcoming modal
  upcomingModal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    marginTop: 'auto',
    maxHeight: '70%',
  },
  upcomingSubtitle: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '500',
    marginBottom: 16,
  },
  upcomingList: {
    maxHeight: 400,
  },
  upcomingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  upcomingItemCompleted: {
    opacity: 0.6,
  },
  upcomingItemCurrent: {
    backgroundColor: '#EBF5FF',
    marginHorizontal: -12,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  upcomingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  upcomingInfo: {
    flex: 1,
  },
  upcomingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  upcomingDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  upcomingStatus: {
    alignItems: 'center',
  },
  upcomingLateText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
});
