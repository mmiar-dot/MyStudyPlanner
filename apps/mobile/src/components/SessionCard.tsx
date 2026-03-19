import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { StudySession } from '../types';
import { useSessionStore } from '../store/sessionStore';
import { format, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../services/api';
import { useTheme } from '../contexts/ThemeContext';

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
  const { isDark, colors, accentColor } = useTheme();
  
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [showCalendarPicker, setShowCalendarPicker] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(session.scheduled_date);
  const [upcomingSessions, setUpcomingSessions] = useState<StudySession[]>([]);
  const [showUpcomingCalendar, setShowUpcomingCalendar] = useState(false);
  const [sessionToReschedule, setSessionToReschedule] = useState<StudySession | null>(null);
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState('');

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
      // Notify parent to refresh data
      onStatusChange?.();
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
      // Notify parent to refresh data
      onStatusChange?.();
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

  const handleUpdateNote = async (noteId: string) => {
    if (!editNoteContent.trim()) return;
    try {
      setIsLoading(true);
      await api.put(`/courses/${session.item_id}/notes/${noteId}`, {
        content: editNoteContent.trim()
      });
      await fetchCourseNotes(session.item_id);
      setEditingNoteId(null);
      setEditNoteContent('');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier la note');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    const doDelete = async () => {
      try {
        setIsLoading(true);
        await api.delete(`/courses/${session.item_id}/notes/${noteId}`);
        await fetchCourseNotes(session.item_id);
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de supprimer la note');
      } finally {
        setIsLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Êtes-vous sûr de vouloir supprimer cette note ?')) {
        await doDelete();
      }
    } else {
      Alert.alert(
        'Supprimer la note',
        'Êtes-vous sûr de vouloir supprimer cette note ?',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: doDelete }
        ]
      );
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
        style={[
          styles.card, 
          { backgroundColor: colors.card, borderColor: colors.cardBorder },
          isCompleted && { backgroundColor: isDark ? '#064E3B' : '#F0FDF4', opacity: 0.9 }, 
          isLate && styles.cardLate
        ]}
        onPress={() => setShowOptionsModal(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.methodBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.methodText}>{getMethodLabel()}</Text>
        </View>
        
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }, isCompleted && styles.titleCompleted]} numberOfLines={2}>
            {session.item_title}
          </Text>
          
          {/* Show notes indicator */}
          {notes.length > 0 && (
            <View style={styles.notesIndicator}>
              <Ionicons name="document-text" size={12} color={colors.warning} />
              <Text style={[styles.notesCount, { color: colors.warning }]}>{notes.length} note(s)</Text>
            </View>
          )}
          
          {session.scheduled_time && (
            <Text style={[styles.time, { color: colors.textSecondary }]}>
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
            <Ionicons name="ellipse-outline" size={32} color={isLate ? colors.error : accentColor} />
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedIcon}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
          </View>
        )}
      </TouchableOpacity>

      {/* Options Modal */}
      <Modal visible={showOptionsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{session.item_title}</Text>
              <TouchableOpacity onPress={() => setShowOptionsModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.sessionInfo}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>
                  {isCompleted ? 'Terminée' : isLate ? 'En retard' : isSkipped ? 'Ignorée' : 'En attente'}
                </Text>
              </View>
              <Text style={[styles.sessionDate, { color: colors.textSecondary }]}>
                Planifiée le {format(new Date(session.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
              </Text>
            </View>

            {/* Course Notes Section */}
            <View style={[styles.notesSection, { backgroundColor: isDark ? '#422006' : '#FFFBEB' }]}>
              <View style={styles.notesSectionHeader}>
                <Ionicons name="document-text-outline" size={18} color={colors.warning} />
                <Text style={[styles.notesSectionTitle, { color: isDark ? '#FBBF24' : '#92400E' }]}>Notes du cours</Text>
              </View>
              
              {notes.length > 0 ? (
                <ScrollView style={styles.notesList} nestedScrollEnabled>
                  {notes.map((note) => (
                    <View key={note.id} style={[styles.noteItem, { backgroundColor: colors.surfaceVariant }]}>
                      {editingNoteId === note.id ? (
                        <View style={styles.editNoteContainer}>
                          <TextInput
                            style={[styles.editNoteInput, { backgroundColor: colors.surface, borderColor: accentColor, color: colors.text }]}
                            value={editNoteContent}
                            onChangeText={setEditNoteContent}
                            multiline
                            autoFocus
                            placeholderTextColor={colors.textTertiary}
                          />
                          <View style={styles.editNoteActions}>
                            <TouchableOpacity 
                              onPress={() => setEditingNoteId(null)}
                              style={[styles.editNoteCancel, { backgroundColor: colors.surfaceVariant }]}
                            >
                              <Text style={[styles.editNoteCancelText, { color: colors.textSecondary }]}>Annuler</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                              onPress={() => handleUpdateNote(note.id)}
                              style={[styles.editNoteSave, { backgroundColor: accentColor }]}
                            >
                              <Text style={styles.editNoteSaveText}>Sauvegarder</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <>
                          <Text style={[styles.noteContent, { color: colors.text }]}>{note.content}</Text>
                          <View style={styles.noteFooter}>
                            <Text style={[styles.noteDate, { color: colors.textTertiary }]}>
                              {format(new Date(note.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}
                            </Text>
                            <View style={styles.noteActions}>
                              <TouchableOpacity 
                                onPress={() => {
                                  setEditingNoteId(note.id);
                                  setEditNoteContent(note.content);
                                }}
                                style={styles.noteActionButton}
                              >
                                <Ionicons name="pencil" size={16} color={accentColor} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleDeleteNote(note.id)}
                                style={styles.noteActionButton}
                              >
                                <Ionicons name="trash" size={16} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </>
                      )}
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={[styles.noNotes, { color: colors.textTertiary }]}>Aucune note pour ce cours</Text>
              )}

              <View style={styles.addNoteRow}>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                  placeholder="Ajouter une note..."
                  placeholderTextColor={colors.textTertiary}
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
                    <ActivityIndicator size="small" color={accentColor} />
                  ) : (
                    <Ionicons name="add-circle" size={28} color={accentColor} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Actions */}
            <View style={[styles.actions, { borderTopColor: colors.border }]}>
              {!isCompleted && !isSkipped && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowOptionsModal(false);
                    onComplete(session);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>Terminer</Text>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={handleUncomplete}
                  disabled={isLoading}
                >
                  <Ionicons name="refresh" size={20} color={colors.warning} />
                  <Text style={[styles.actionText, { color: colors.warning }]}>Annuler</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  setShowOptionsModal(false);
                  // Délai pour éviter le conflit de modals sur mobile
                  setTimeout(() => setShowRescheduleModal(true), 100);
                }}
              >
                <Ionicons name="calendar" size={20} color={accentColor} />
                <Text style={[styles.actionText, { color: accentColor }]}>Déplacer</Text>
              </TouchableOpacity>

              {!isCompleted && !isSkipped && onSkip && (
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => {
                    setShowOptionsModal(false);
                    onSkip(session);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                  <Text style={[styles.actionText, { color: colors.textTertiary }]}>Ignorer</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => {
                  fetchUpcomingSessions();
                  setShowOptionsModal(false);
                  setShowUpcomingModal(true);
                }}
              >
                <Ionicons name="list" size={20} color={colors.textSecondary} />
                <Text style={[styles.actionText, { color: colors.textSecondary }]}>Toutes les sessions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal visible={showRescheduleModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.rescheduleModal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Déplacer la session</Text>
              <TouchableOpacity onPress={() => setShowRescheduleModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.rescheduleContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={[styles.rescheduleLabel, { color: colors.textSecondary }]}>Dates rapides :</Text>

              <View style={styles.quickDates}>
                {quickDates.map((qd) => (
                  <TouchableOpacity
                    key={qd.date}
                    style={[
                      styles.quickDateButton, 
                      { backgroundColor: colors.surfaceVariant },
                      selectedDate === qd.date && { backgroundColor: accentColor }
                    ]}
                    onPress={() => setSelectedDate(qd.date)}
                  >
                    <Text style={[
                      styles.quickDateText, 
                      { color: colors.text },
                      selectedDate === qd.date && styles.quickDateTextSelected
                    ]}>
                      {qd.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.rescheduleLabel, { color: colors.textSecondary }]}>Ou choisir une date :</Text>
              
              <TouchableOpacity 
                style={[styles.calendarToggle, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
                onPress={() => setShowCalendarPicker(!showCalendarPicker)}
              >
                <Ionicons name="calendar" size={20} color={accentColor} />
                <Text style={[styles.calendarToggleText, { color: colors.text }]}>
                  {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: fr })}
                </Text>
                <Ionicons name={showCalendarPicker ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
              </TouchableOpacity>

              {showCalendarPicker && (
                <View style={[styles.calendarContainer, { borderColor: colors.border }]}>
                  <Calendar
                    current={selectedDate}
                    onDayPress={(day: any) => {
                      setSelectedDate(day.dateString);
                      setShowCalendarPicker(false);
                    }}
                    markedDates={{
                      [selectedDate]: { selected: true, selectedColor: accentColor },
                      [session.scheduled_date]: { marked: true, dotColor: colors.error }
                    }}
                    minDate={format(new Date(), 'yyyy-MM-dd')}
                    theme={{
                      backgroundColor: colors.card,
                      calendarBackground: colors.card,
                      textSectionTitleColor: colors.textSecondary,
                      dayTextColor: colors.text,
                      todayTextColor: accentColor,
                      selectedDayBackgroundColor: accentColor,
                      selectedDayTextColor: '#FFFFFF',
                      monthTextColor: colors.text,
                      arrowColor: accentColor,
                      textDisabledColor: colors.textTertiary,
                    }}
                  />
                </View>
              )}

              {/* View upcoming sessions */}
              <TouchableOpacity
                style={styles.viewUpcomingButton}
                onPress={() => {
                  fetchUpcomingSessions();
                  setShowUpcomingModal(true);
                }}
              >
                <Ionicons name="list" size={18} color={accentColor} />
                <Text style={[styles.viewUpcomingText, { color: accentColor }]}>Voir toutes les sessions de ce cours</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity
              style={[styles.rescheduleButton, { backgroundColor: accentColor }, isLoading && styles.buttonDisabled]}
              onPress={handleReschedule}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.rescheduleButtonText}>Confirmer le déplacement</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Upcoming Sessions Modal */}
      <Modal visible={showUpcomingModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.upcomingModal, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Sessions planifiées</Text>
              <TouchableOpacity onPress={() => setShowUpcomingModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.upcomingSubtitle, { color: accentColor }]}>{session.item_title}</Text>

            <ScrollView style={styles.upcomingList}>
              {upcomingSessions.map((s, idx) => {
                // Compare only dates, not times - today should not be "late"
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const sessionDate = new Date(s.scheduled_date);
                sessionDate.setHours(0, 0, 0, 0);
                const isPast = sessionDate < today;
                const isToday = sessionDate.getTime() === today.getTime();
                const isCurrent = s.id === session.id;
                
                return (
                  <View 
                    key={s.id} 
                    style={[
                      styles.upcomingItem,
                      { borderBottomColor: colors.border },
                      s.status === 'completed' && styles.upcomingItemCompleted,
                      isCurrent && { backgroundColor: isDark ? accentColor + '30' : '#EBF5FF' }
                    ]}
                  >
                    <View style={[
                      styles.upcomingDot,
                      { backgroundColor: s.status === 'completed' ? colors.success : isPast ? colors.error : isToday ? colors.warning : accentColor }
                    ]} />
                    <View style={styles.upcomingInfo}>
                      <Text style={[styles.upcomingLabel, { color: colors.text }]}>
                        {s.j_day !== undefined ? `J${s.j_day}` : s.tour_number ? `Tour ${s.tour_number}` : 'SRS'}
                        {isCurrent && ' (actuel)'}
                      </Text>
                      <Text style={[styles.upcomingDate, { color: colors.textSecondary }]}>
                        {format(new Date(s.scheduled_date), 'dd MMMM yyyy', { locale: fr })}
                        {isToday && ' (aujourd\'hui)'}
                      </Text>
                    </View>
                    <View style={styles.upcomingStatus}>
                      {s.status === 'completed' ? (
                        <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                      ) : s.status === 'skipped' ? (
                        <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
                      ) : isPast ? (
                        <Text style={[styles.upcomingLateText, { color: colors.error }]}>En retard</Text>
                      ) : (
                        <TouchableOpacity
                          style={[styles.rescheduleArrow, { backgroundColor: isDark ? accentColor + '30' : '#EBF5FF' }]}
                          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                          onPress={() => {
                            setSessionToReschedule(s);
                            setRescheduleTargetDate(s.scheduled_date);
                            setShowUpcomingCalendar(true);
                          }}
                        >
                          <Ionicons name="calendar-outline" size={24} color={accentColor} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            {/* Calendar picker for rescheduling */}
            {showUpcomingCalendar && sessionToReschedule && (
              <View style={styles.upcomingCalendarOverlay}>
                <ScrollView 
                  style={styles.upcomingCalendarScroll}
                  contentContainerStyle={styles.upcomingCalendarScrollContent}
                  showsVerticalScrollIndicator={false}
                >
                  <View style={[styles.upcomingCalendarContainer, { backgroundColor: colors.card }]}>
                    <View style={styles.upcomingCalendarHeader}>
                      <Text style={[styles.upcomingCalendarTitle, { color: colors.text }]}>
                        Déplacer {sessionToReschedule.j_day !== undefined ? `J${sessionToReschedule.j_day}` : 'la session'}
                      </Text>
                      <TouchableOpacity onPress={() => {
                        setShowUpcomingCalendar(false);
                        setSessionToReschedule(null);
                      }}>
                        <Ionicons name="close" size={24} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    
                    <Calendar
                      current={rescheduleTargetDate}
                      onDayPress={(day: any) => setRescheduleTargetDate(day.dateString)}
                      markedDates={{
                        [rescheduleTargetDate]: { selected: true, selectedColor: accentColor },
                        [sessionToReschedule.scheduled_date]: { marked: true, dotColor: colors.error }
                      }}
                      minDate={format(new Date(), 'yyyy-MM-dd')}
                      theme={{
                        backgroundColor: colors.card,
                        calendarBackground: colors.card,
                        textSectionTitleColor: colors.textSecondary,
                        dayTextColor: colors.text,
                        todayTextColor: accentColor,
                        selectedDayBackgroundColor: accentColor,
                        selectedDayTextColor: '#FFFFFF',
                        monthTextColor: colors.text,
                        arrowColor: accentColor,
                        textDisabledColor: colors.textTertiary,
                      }}
                    />

                    <View style={styles.upcomingCalendarActions}>
                      <TouchableOpacity 
                        style={[styles.upcomingCalendarCancel, { backgroundColor: colors.surfaceVariant }]}
                        onPress={() => {
                          setShowUpcomingCalendar(false);
                          setSessionToReschedule(null);
                        }}
                      >
                        <Text style={[styles.upcomingCalendarCancelText, { color: colors.textSecondary }]}>Annuler</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.upcomingCalendarConfirm, { backgroundColor: accentColor }, isLoading && styles.buttonDisabled]}
                        onPress={async () => {
                          if (!sessionToReschedule) return;
                          setIsLoading(true);
                          try {
                            await rescheduleSession(sessionToReschedule.id, rescheduleTargetDate);
                            await fetchUpcomingSessions();
                            onStatusChange?.();
                            setShowUpcomingCalendar(false);
                            setSessionToReschedule(null);
                          } catch (error) {
                            console.error('Reschedule error:', error);
                            Alert.alert('Erreur', 'Impossible de déplacer la session');
                          } finally {
                            setIsLoading(false);
                          }
                        }}
                        disabled={isLoading || rescheduleTargetDate === sessionToReschedule.scheduled_date}
                      >
                        {isLoading ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.upcomingCalendarConfirmText}>Confirmer</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </ScrollView>
              </View>
            )}
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
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  noteDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  noteActions: {
    flexDirection: 'row',
    gap: 8,
  },
  noteActionButton: {
    padding: 4,
  },
  editNoteContainer: {
    flex: 1,
  },
  editNoteInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    minHeight: 60,
  },
  editNoteActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
  editNoteCancel: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  editNoteCancelText: {
    fontSize: 13,
    color: '#6B7280',
  },
  editNoteSave: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  editNoteSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
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
    maxHeight: '80%',
  },
  rescheduleContent: {
    maxHeight: 400,
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
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
  },
  upcomingLateText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  rescheduleArrow: {
    padding: 10,
    borderRadius: 22,
    backgroundColor: '#EBF5FF',
  },
  // Calendar overlay for rescheduling from upcoming list
  upcomingCalendarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  upcomingCalendarScroll: {
    flex: 1,
  },
  upcomingCalendarScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  upcomingCalendarContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 350,
  },
  upcomingCalendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  upcomingCalendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  upcomingCalendarActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  upcomingCalendarCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  upcomingCalendarCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  upcomingCalendarConfirm: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
  },
  upcomingCalendarConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
