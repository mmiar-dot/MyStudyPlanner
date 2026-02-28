import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  useWindowDimensions,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, DateData } from 'react-native-calendars';
import { format, parseISO, startOfMonth, endOfMonth, addMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSessionStore } from '../../src/store/sessionStore';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import { useEventStore, CalendarEvent } from '../../src/store/eventStore';
import { SessionCard } from '../../src/components/SessionCard';
import { SRSRatingModal } from '../../src/components/SRSRatingModal';
import { ColorPicker } from '../../src/components/ColorPicker';
import { StudySession, CalendarDayData, PersonalEvent, ICSSubscription } from '../../src/types';

export default function CalendarScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [daySessions, setDaySessions] = useState<StudySession[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [srsSession, setSrsSession] = useState<StudySession | null>(null);
  
  // Event modal states
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');
  const [eventColor, setEventColor] = useState('#3B82F6');
  const [eventDate, setEventDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showEventDatePicker, setShowEventDatePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [deleteEventTitle, setDeleteEventTitle] = useState('');
  
  // ICS modal states
  const [showICSModal, setShowICSModal] = useState(false);
  const [icsName, setIcsName] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [icsColor, setIcsColor] = useState('#10B981');

  const { fetchSessionsByDate, completeSession } = useSessionStore();
  const { calendarData, fetchCalendarData } = useAnalyticsStore();
  const { events, allCalendarEvents, icsSubscriptions, fetchEvents, fetchAllCalendarEvents, fetchICSSubscriptions, createEvent, updateEvent, deleteEvent, subscribeICS, syncICS, deleteICSSubscription } = useEventStore();

  // Helper function to format event time (handles both datetime and date-only formats)
  const formatEventTime = (timeStr: string): string => {
    try {
      if (!timeStr) return '--:--';
      // If it contains T, it's datetime format
      if (timeStr.includes('T')) {
        return format(parseISO(timeStr), 'HH:mm');
      }
      // If it's just a date, return "Journée"
      return 'Journée';
    } catch {
      return '--:--';
    }
  };

  const loadMonthData = useCallback(async () => {
    const month = currentMonth.getMonth() + 1;
    const year = currentMonth.getFullYear();
    
    // Calculate date range for the month (plus buffer for calendar display)
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = format(subMonths(monthStart, 1), 'yyyy-MM-dd');
    const endDate = format(addMonths(monthEnd, 1), 'yyyy-MM-dd');
    
    await Promise.all([
      fetchCalendarData(month, year),
      fetchEvents(),
      fetchAllCalendarEvents(startDate, endDate),
      fetchICSSubscriptions(),
    ]);
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

  const handleCreateEvent = async () => {
    if (!eventTitle.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }
    
    try {
      setIsSubmitting(true);
      const finalEventDate = editingEvent ? editingEvent.start_time.split('T')[0] : eventDate;
      const startDateTime = `${finalEventDate}T${eventStartTime}:00`;
      const endDateTime = `${finalEventDate}T${eventEndTime}:00`;
      
      if (editingEvent) {
        // Update existing event
        await updateEvent(editingEvent.id, {
          title: eventTitle.trim(),
          start_time: startDateTime,
          end_time: endDateTime,
          description: eventDescription.trim() || undefined,
          color: eventColor,
        });
      } else {
        // Create new event
        await createEvent({
          title: eventTitle.trim(),
          start_time: startDateTime,
          end_time: endDateTime,
          description: eventDescription.trim() || undefined,
          color: eventColor,
        });
      }
      
      // Refresh all calendar events
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = format(subMonths(monthStart, 1), 'yyyy-MM-dd');
      const endDate = format(addMonths(monthEnd, 1), 'yyyy-MM-dd');
      await fetchAllCalendarEvents(startDate, endDate);
      
      setShowEventModal(false);
      resetEventForm();
    } catch (error) {
      Alert.alert('Erreur', editingEvent ? 'Impossible de modifier l\'événement' : 'Impossible de créer l\'événement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = (eventId: string, title: string) => {
    setDeleteEventId(eventId);
    setDeleteEventTitle(title);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteEvent = async () => {
    if (!deleteEventId) return;
    try {
      await deleteEvent(deleteEventId);
      // Refresh all calendar events
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const startDate = format(subMonths(monthStart, 1), 'yyyy-MM-dd');
      const endDate = format(addMonths(monthEnd, 1), 'yyyy-MM-dd');
      await fetchAllCalendarEvents(startDate, endDate);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer l\'événement');
    } finally {
      setShowDeleteConfirm(false);
      setDeleteEventId(null);
      setDeleteEventTitle('');
    }
  };

  const handleSubscribeICS = async () => {
    if (!icsName.trim() || !icsUrl.trim()) {
      Alert.alert('Erreur', 'Le nom et l\'URL sont requis');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await subscribeICS(icsName.trim(), icsUrl.trim(), icsColor);
      setShowICSModal(false);
      resetICSForm();
      Alert.alert('Succès', 'Calendrier ajouté. Synchronisation en cours...');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter le calendrier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEventModal = (date?: string) => {
    setEventDate(date || selectedDate);
    setShowEventDatePicker(false);
    openEventModal();
  };

  const resetEventForm = () => {
    setEventTitle('');
    setEventDescription('');
    setEventStartTime('09:00');
    setEventEndTime('10:00');
    setEventColor('#3B82F6');
    setEditingEvent(null);
  };

  const resetICSForm = () => {
    setIcsName('');
    setIcsUrl('');
    setIcsColor('#10B981');
  };

  // Get events for selected date (combine personal + ICS events)
  const dayEvents = allCalendarEvents.filter(e => {
    const eventDate = e.start_time.split('T')[0];
    return eventDate === selectedDate;
  });

  // Separate personal events and ICS events
  const personalEvents = dayEvents.filter(e => e.type === 'personal');
  const icsEvents = dayEvents.filter(e => e.type === 'ics');

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

  // Mark all calendar event dates (personal + ICS)
  allCalendarEvents.forEach(event => {
    const eventDate = event.start_time.split('T')[0];
    if (markedDates[eventDate]) {
      markedDates[eventDate].dots = [
        ...(markedDates[eventDate].dots || [{ color: markedDates[eventDate].dotColor }]),
        { color: event.color }
      ];
    } else {
      markedDates[eventDate] = {
        dots: [{ color: event.color }],
        selected: eventDate === selectedDate,
        selectedColor: eventDate === selectedDate ? '#3B82F6' : undefined,
      };
    }
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
    markedDates[today] = { today: true };
  }

  const pendingSessions = daySessions.filter(s => s.status !== 'completed');
  const completedSessions = daySessions.filter(s => s.status === 'completed');

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
          <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Calendrier</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => openEventModal()}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              {isDesktop && <Text style={styles.addButtonText}>Événement</Text>}
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.icsButton}
              onPress={() => setShowICSModal(true)}
            >
              <Ionicons name="link" size={20} color="#3B82F6" />
              {isDesktop && <Text style={styles.icsButtonText}>Calendrier ICS</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <View style={[styles.mainContent, isDesktop && styles.mainContentDesktop]}>
          {/* Calendar Column */}
          <View style={[styles.calendarColumn, isDesktop && styles.calendarColumnDesktop]}>
            {/* Calendar */}
            <View style={styles.calendarContainer}>
              <Calendar
                current={format(currentMonth, 'yyyy-MM-dd')}
                onDayPress={(day: DateData) => setSelectedDate(day.dateString)}
                onMonthChange={(month: DateData) => {
                  setCurrentMonth(new Date(month.year, month.month - 1));
                }}
                markedDates={markedDates}
                markingType="multi-dot"
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

            {/* ICS Subscriptions */}
            {icsSubscriptions.length > 0 && (
              <View style={styles.icsSection}>
                <Text style={styles.icsSectionTitle}>Calendriers abonnés</Text>
                {icsSubscriptions.map((sub) => (
                  <View key={sub.id} style={styles.icsItem}>
                    <View style={[styles.icsColor, { backgroundColor: sub.color }]} />
                    <View style={styles.icsInfo}>
                      <Text style={styles.icsName}>{sub.name}</Text>
                      {sub.last_synced && (
                        <Text style={styles.icsLastSync}>
                          Sync: {format(parseISO(sub.last_synced), 'dd/MM HH:mm')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity onPress={() => syncICS(sub.id)}>
                      <Ionicons name="sync" size={20} color="#6B7280" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                      Alert.alert('Supprimer', `Supprimer "${sub.name}" ?`, [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Supprimer', style: 'destructive', onPress: () => deleteICSSubscription(sub.id) }
                      ]);
                    }}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Sessions/Events Column */}
          <View style={[styles.sessionsColumn, isDesktop && styles.sessionsColumnDesktop]}>
            <Text style={styles.dateTitle}>
              {format(new Date(selectedDate), "EEEE d MMMM", { locale: fr })}
            </Text>

            {/* Personal Events */}
            {personalEvents.length > 0 && (
              <View style={styles.eventsSection}>
                <Text style={styles.eventsSectionTitle}>Événements personnels</Text>
                {personalEvents.map((event) => (
                  <TouchableOpacity 
                    key={event.id} 
                    style={styles.eventCard}
                    onPress={() => {
                      // Open edit modal
                      setEditingEvent(event);
                      setEventTitle(event.title);
                      setEventDescription(event.description || '');
                      setEventColor(event.color);
                      const startParts = event.start_time.split('T');
                      const endParts = event.end_time.split('T');
                      if (startParts[1]) setEventStartTime(startParts[1].substring(0, 5));
                      if (endParts[1]) setEventEndTime(endParts[1].substring(0, 5));
                      openEventModal();
                    }}
                  >
                    <View style={[styles.eventColor, { backgroundColor: event.color }]} />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>
                        {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
                      </Text>
                      {event.description && (
                        <Text style={styles.eventDescription}>{event.description}</Text>
                      )}
                    </View>
                    <View style={styles.eventActions}>
                      <TouchableOpacity 
                        style={styles.eventActionBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          // Open edit modal
                          setEditingEvent(event);
                          setEventTitle(event.title);
                          setEventDescription(event.description || '');
                          setEventColor(event.color);
                          const startParts = event.start_time.split('T');
                          const endParts = event.end_time.split('T');
                          if (startParts[1]) setEventStartTime(startParts[1].substring(0, 5));
                          if (endParts[1]) setEventEndTime(endParts[1].substring(0, 5));
                          openEventModal();
                        }}
                      >
                        <Ionicons name="pencil-outline" size={16} color="#3B82F6" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.eventActionBtn}
                        onPress={(e) => {
                          e.stopPropagation();
                          handleDeleteEvent(event.id, event.title);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* ICS Events (University Calendar) */}
            {icsEvents.length > 0 && (
              <View style={styles.eventsSection}>
                <Text style={styles.eventsSectionTitle}>
                  <Ionicons name="school-outline" size={14} color="#10B981" /> Calendrier universitaire
                </Text>
                {icsEvents.map((event) => (
                  <View key={event.id} style={styles.icsEventCard}>
                    <View style={[styles.eventColor, { backgroundColor: event.color }]} />
                    <View style={styles.eventInfo}>
                      <Text style={styles.eventTitle}>{event.title}</Text>
                      <Text style={styles.eventTime}>
                        {formatEventTime(event.start_time)} - {formatEventTime(event.end_time)}
                      </Text>
                      {event.location && (
                        <View style={styles.locationRow}>
                          <Ionicons name="location-outline" size={12} color="#9CA3AF" />
                          <Text style={styles.eventLocation}>{event.location}</Text>
                        </View>
                      )}
                      <Text style={styles.eventSource}>{event.source}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Study Sessions */}
            {daySessions.length === 0 && dayEvents.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color="#9CA3AF" />
                <Text style={styles.emptyText}>Aucune session ni événement</Text>
                <TouchableOpacity 
                  style={styles.addEventButton}
                  onPress={() => openEventModal()}
                >
                  <Ionicons name="add" size={18} color="#3B82F6" />
                  <Text style={styles.addEventButtonText}>Ajouter un événement</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {pendingSessions.length > 0 && (
                  <View style={styles.sessionGroup}>
                    <Text style={styles.groupTitle}>
                      Sessions à faire ({pendingSessions.length})
                    </Text>
                    {pendingSessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        onComplete={() => handleCompleteSession(session)}
                        onPress={() => {}}
                        onStatusChange={loadDaySessions}
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
                        onStatusChange={loadDaySessions}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Create Event Modal */}
      <Modal visible={showEventModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
              </Text>
              <TouchableOpacity onPress={() => { setShowEventModal(false); resetEventForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Date selector */}
            <TouchableOpacity 
              style={styles.dateSelector}
              onPress={() => setShowEventDatePicker(!showEventDatePicker)}
            >
              <Ionicons name="calendar" size={20} color="#3B82F6" />
              <Text style={styles.dateSelectorText}>
                {format(new Date(editingEvent ? editingEvent.start_time.split('T')[0] : eventDate), "EEEE d MMMM yyyy", { locale: fr })}
              </Text>
              <Ionicons name={showEventDatePicker ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
            </TouchableOpacity>

            {showEventDatePicker && (
              <Calendar
                current={eventDate}
                onDayPress={(day) => {
                  setEventDate(day.dateString);
                  setShowEventDatePicker(false);
                }}
                markedDates={{
                  [eventDate]: { selected: true, selectedColor: '#3B82F6' }
                }}
                theme={{
                  todayTextColor: '#3B82F6',
                  selectedDayBackgroundColor: '#3B82F6',
                }}
                firstDay={1}
                style={styles.eventDateCalendar}
              />
            )}

            <TextInput
              style={styles.input}
              placeholder="Titre de l'événement"
              placeholderTextColor="#9CA3AF"
              value={eventTitle}
              onChangeText={setEventTitle}
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optionnel)"
              placeholderTextColor="#9CA3AF"
              value={eventDescription}
              onChangeText={setEventDescription}
              multiline
              numberOfLines={3}
              returnKeyType="default"
            />

            <View style={styles.timeRow}>
              <View style={styles.timeInput}>
                <Text style={styles.timeLabel}>Début</Text>
                <TextInput
                  style={styles.timeField}
                  placeholder="09:00"
                  placeholderTextColor="#9CA3AF"
                  value={eventStartTime}
                  onChangeText={setEventStartTime}
                />
              </View>
              <View style={styles.timeInput}>
                <Text style={styles.timeLabel}>Fin</Text>
                <TextInput
                  style={styles.timeField}
                  placeholder="10:00"
                  placeholderTextColor="#9CA3AF"
                  value={eventEndTime}
                  onChangeText={setEventEndTime}
                />
              </View>
            </View>

            <Text style={styles.colorLabel}>Couleur</Text>
            <ColorPicker selectedColor={eventColor} onColorSelect={setEventColor} compact />

            <TouchableOpacity
              style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
              onPress={handleCreateEvent}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>
                  {editingEvent ? 'Enregistrer' : 'Créer l\'événement'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteConfirm} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.deleteConfirmModal}>
            <Ionicons name="trash" size={48} color="#EF4444" />
            <Text style={styles.deleteConfirmTitle}>Supprimer l'événement ?</Text>
            <Text style={styles.deleteConfirmText}>
              "{deleteEventTitle}" sera définitivement supprimé.
            </Text>
            <View style={styles.deleteConfirmButtons}>
              <TouchableOpacity 
                style={[styles.deleteConfirmBtn, styles.cancelBtn]}
                onPress={() => {
                  setShowDeleteConfirm(false);
                  setDeleteEventId(null);
                  setDeleteEventTitle('');
                }}
              >
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.deleteConfirmBtn, styles.deleteBtn]}
                onPress={confirmDeleteEvent}
              >
                <Text style={styles.deleteBtnText}>Supprimer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ICS Subscription Modal */}
      <Modal visible={showICSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un calendrier ICS</Text>
              <TouchableOpacity onPress={() => { setShowICSModal(false); resetICSForm(); }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nom du calendrier (ex: Faculté)"
              placeholderTextColor="#9CA3AF"
              value={icsName}
              onChangeText={setIcsName}
            />

            <TextInput
              style={styles.input}
              placeholder="URL du calendrier ICS"
              placeholderTextColor="#9CA3AF"
              value={icsUrl}
              onChangeText={setIcsUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.colorLabel}>Couleur</Text>
            <ColorPicker selectedColor={icsColor} onColorSelect={setIcsColor} compact />

            <TouchableOpacity
              style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
              onPress={handleSubscribeICS}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Ajouter le calendrier</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  scrollContentDesktop: {
    padding: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 0,
  },
  headerDesktop: {
    padding: 0,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  titleDesktop: {
    fontSize: 32,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  icsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  icsButtonText: {
    color: '#3B82F6',
    fontWeight: '600',
    fontSize: 14,
  },
  mainContent: {
    flex: 1,
  },
  mainContentDesktop: {
    flexDirection: 'row',
    gap: 24,
  },
  calendarColumn: {
    flex: 1,
  },
  calendarColumnDesktop: {
    flex: 1,
    maxWidth: 400,
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
  icsSection: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  icsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  icsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  icsColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  icsInfo: {
    flex: 1,
  },
  icsName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  icsLastSync: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sessionsColumn: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sessionsColumnDesktop: {
    flex: 2,
    paddingHorizontal: 0,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  eventsSection: {
    marginBottom: 20,
  },
  eventsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
  },
  eventColor: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  eventInfo: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  eventTime: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  eventDescription: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
  },
  icsEventCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  eventLocation: {
    fontSize: 12,
    color: '#6B7280',
  },
  eventSource: {
    fontSize: 11,
    color: '#10B981',
    marginTop: 4,
    fontStyle: 'italic',
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
    marginBottom: 16,
  },
  addEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
    borderRadius: 8,
  },
  addEventButtonText: {
    color: '#3B82F6',
    fontWeight: '500',
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
    padding: 24,
    maxHeight: '80%',
  },
  modalContentDesktop: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 24,
    marginBottom: 40,
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
  },
  modalDate: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 16,
    textTransform: 'capitalize',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    color: '#1F2937',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 6,
  },
  timeField: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  colorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  eventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  eventActionBtn: {
    padding: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  deleteConfirmModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    margin: 20,
  },
  deleteConfirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  deleteConfirmText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  deleteConfirmButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  cancelBtnText: {
    color: '#6B7280',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#EF4444',
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
