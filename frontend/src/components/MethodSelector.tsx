import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../types';
import { format, addDays, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MethodSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (
    method: RevisionMethod,
    jSettings?: JMethodSettings,
    srsSettings?: SRSSettings,
    toursSettings?: ToursSettings
  ) => void;
  itemTitle: string;
  currentMethod?: RevisionMethod;
  isChapter?: boolean; // For Tours method - only chapters can use it
}

// Common J-method presets
const J_PRESETS = {
  classic: { name: 'Classique', intervals: [0, 1, 3, 7, 14, 30, 60, 120] },
  intensive: { name: 'Intensif', intervals: [0, 1, 2, 4, 7, 14, 28, 56] },
  relaxed: { name: 'Espacé', intervals: [0, 2, 7, 14, 30, 60, 90, 150] },
  exam: { name: 'Pré-examen', intervals: [0, 1, 3, 5, 7, 10, 14, 21] },
};

const RECURRING_INTERVAL = 150; // Days between reviews after completing the cycle

export const MethodSelector: React.FC<MethodSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  itemTitle,
  currentMethod,
  isChapter = false,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const [selectedMethod, setSelectedMethod] = useState<RevisionMethod>(currentMethod || 'none');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showCalendar, setShowCalendar] = useState(false);
  
  // J-method settings
  const [selectedPreset, setSelectedPreset] = useState<string>('classic');
  const [customIntervals, setCustomIntervals] = useState<number[]>(J_PRESETS.classic.intervals);
  const [showCustomIntervals, setShowCustomIntervals] = useState(false);
  const [enableRecurring, setEnableRecurring] = useState(true);
  const [recurringInterval, setRecurringInterval] = useState(RECURRING_INTERVAL.toString());
  
  // For existing progress
  const [hasExistingProgress, setHasExistingProgress] = useState(false);
  const [existingJDay, setExistingJDay] = useState('0');
  const [existingSRSInterval, setExistingSRSInterval] = useState('1');
  const [existingSRSEasiness, setExistingSRSEasiness] = useState('2.5');
  
  // Tours settings
  const [totalTours, setTotalTours] = useState('3');
  const [tourDuration, setTourDuration] = useState('30');

  // Get the actual intervals to use
  const activeIntervals = useMemo(() => {
    return customIntervals;
  }, [customIntervals]);

  // Apply preset
  const applyPreset = (presetKey: string) => {
    setSelectedPreset(presetKey);
    setCustomIntervals([...J_PRESETS[presetKey as keyof typeof J_PRESETS].intervals]);
    setShowCustomIntervals(false);
  };

  // Calculate adjusted start date based on existing progress
  const adjustedStartDate = useMemo(() => {
    if (!hasExistingProgress) return startDate;
    
    if (selectedMethod === 'j_method') {
      const existingDay = parseInt(existingJDay) || 0;
      // Find the closest J-day that's <= existingDay
      let lastCompletedIdx = -1;
      for (let i = 0; i < activeIntervals.length; i++) {
        if (activeIntervals[i] <= existingDay) {
          lastCompletedIdx = i;
        }
      }
      // Calculate how many days ago J0 was
      if (lastCompletedIdx >= 0) {
        const daysAgo = existingDay;
        return format(addDays(new Date(startDate), -daysAgo), 'yyyy-MM-dd');
      }
    }
    
    return startDate;
  }, [hasExistingProgress, existingJDay, selectedMethod, startDate, activeIntervals]);

  // Calculate preview dates
  const previewDates = useMemo(() => {
    const start = new Date(adjustedStartDate);
    if (isNaN(start.getTime())) return [];
    
    const today = new Date();
    
    if (selectedMethod === 'j_method') {
      const existingDay = hasExistingProgress ? parseInt(existingJDay) || 0 : 0;
      
      let dates = activeIntervals.map((interval) => {
        const date = addDays(start, interval);
        const isPast = date < today && interval <= existingDay;
        const isToday = format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
        return {
          label: `J${interval}`,
          date: format(date, 'dd MMM', { locale: fr }),
          isPast,
          isToday,
          interval
        };
      });
      
      // Add recurring review after 120 days
      if (enableRecurring) {
        const lastInterval = activeIntervals[activeIntervals.length - 1];
        const recInt = parseInt(recurringInterval) || RECURRING_INTERVAL;
        dates.push({
          label: `Puis tous les ${recInt}J`,
          date: format(addDays(start, lastInterval + recInt), 'dd MMM', { locale: fr }),
          isPast: false,
          isToday: false,
          interval: lastInterval + recInt
        });
      }
      
      return dates;
    }
    
    if (selectedMethod === 'tours') {
      const tours = parseInt(totalTours) || 3;
      const duration = parseInt(tourDuration) || 30;
      const dates = [];
      let currentDate = start;
      
      for (let t = 1; t <= tours; t++) {
        dates.push({
          label: `Tour ${t}`,
          date: `${format(currentDate, 'dd MMM', { locale: fr })} - ${format(addDays(currentDate, duration - 1), 'dd MMM', { locale: fr })}`,
          isPast: false,
          isToday: false,
        });
        currentDate = addDays(currentDate, duration);
      }
      return dates;
    }
    
    if (selectedMethod === 'srs') {
      const existingInt = hasExistingProgress ? parseInt(existingSRSInterval) || 1 : 1;
      return [
        { label: 'Prochaine révision', date: format(start, 'dd MMM', { locale: fr }), isPast: false, isToday: false },
        { label: 'Intervalle actuel', date: `${existingInt} jour(s)`, isPast: false, isToday: false },
        { label: 'Si réussite (3-5)', date: 'Intervalle × 2.5', isPast: false, isToday: false },
        { label: 'Si échec (0-2)', date: 'Retour à J1', isPast: false, isToday: false }
      ];
    }
    
    return [];
  }, [selectedMethod, adjustedStartDate, totalTours, tourDuration, activeIntervals, hasExistingProgress, existingJDay, enableRecurring, recurringInterval, existingSRSInterval]);

  const handleConfirm = () => {
    let jSettings: JMethodSettings | undefined;
    let srsSettings: SRSSettings | undefined;
    let toursSettings: ToursSettings | undefined;

    if (selectedMethod === 'j_method') {
      const existingDay = hasExistingProgress ? parseInt(existingJDay) || 0 : 0;
      jSettings = {
        start_date: adjustedStartDate,
        intervals: activeIntervals,
        recurring_interval: enableRecurring ? parseInt(recurringInterval) || RECURRING_INTERVAL : 0,
        current_j_index: hasExistingProgress ? activeIntervals.findIndex(i => i > existingDay) : 0,
      };
    } else if (selectedMethod === 'srs') {
      const existingInt = hasExistingProgress ? parseInt(existingSRSInterval) || 1 : 1;
      const existingEase = hasExistingProgress ? parseFloat(existingSRSEasiness) || 2.5 : 2.5;
      srsSettings = {
        easiness_factor: existingEase,
        interval: existingInt,
        repetitions: hasExistingProgress ? Math.floor(Math.log2(existingInt)) : 0,
        next_review: startDate,
      };
    } else if (selectedMethod === 'tours') {
      const tours = parseInt(totalTours) || 3;
      const duration = parseInt(tourDuration) || 30;
      toursSettings = {
        total_tours: tours,
        tour_durations: Array(tours).fill(duration),
        current_tour: 1,
        start_date: startDate,
      };
    }

    onSelect(selectedMethod, jSettings, srsSettings, toursSettings);
    onClose();
  };

  const updateInterval = (index: number, value: string) => {
    const newIntervals = [...customIntervals];
    newIntervals[index] = parseInt(value) || 0;
    // Sort to maintain order
    newIntervals.sort((a, b) => a - b);
    setCustomIntervals(newIntervals);
  };

  const addInterval = () => {
    const last = customIntervals[customIntervals.length - 1] || 0;
    setCustomIntervals([...customIntervals, last + 30]);
  };

  const removeInterval = (index: number) => {
    if (customIntervals.length > 2) {
      setCustomIntervals(customIntervals.filter((_, i) => i !== index));
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, isDesktop && styles.modalDesktop]}>
          <View style={styles.header}>
            <Text style={styles.title}>Méthode de révision</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTitle}>{itemTitle}</Text>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Method Options */}
            <TouchableOpacity
              style={[styles.methodOption, selectedMethod === 'j_method' && styles.methodSelected]}
              onPress={() => setSelectedMethod('j_method')}
            >
              <View style={styles.methodIcon}>
                <Text style={styles.methodIconText}>J</Text>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Méthode des J</Text>
                <Text style={styles.methodDesc}>Révision espacée sur des jours clés</Text>
              </View>
              {selectedMethod === 'j_method' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.methodOption, selectedMethod === 'srs' && styles.methodSelected]}
              onPress={() => setSelectedMethod('srs')}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#8B5CF6' }]}>
                <Ionicons name="sync" size={20} color="#FFF" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>SRS (Anki-like)</Text>
                <Text style={styles.methodDesc}>Algorithme SM-2 adaptatif selon vos réponses</Text>
              </View>
              {selectedMethod === 'srs' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            {isChapter && (
              <TouchableOpacity
                style={[styles.methodOption, selectedMethod === 'tours' && styles.methodSelected]}
                onPress={() => setSelectedMethod('tours')}
              >
                <View style={[styles.methodIcon, { backgroundColor: '#10B981' }]}>
                  <Ionicons name="repeat" size={20} color="#FFF" />
                </View>
                <View style={styles.methodInfo}>
                  <Text style={styles.methodTitle}>Méthode des Tours</Text>
                  <Text style={styles.methodDesc}>Répartit tous les cours du chapitre</Text>
                </View>
                {selectedMethod === 'tours' && (
                  <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.methodOption, selectedMethod === 'none' && styles.methodSelected]}
              onPress={() => setSelectedMethod('none')}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#9CA3AF' }]}>
                <Ionicons name="close" size={20} color="#FFF" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Aucune méthode</Text>
                <Text style={styles.methodDesc}>Pas de sessions planifiées</Text>
              </View>
              {selectedMethod === 'none' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            {/* Settings based on method */}
            {selectedMethod !== 'none' && (
              <View style={styles.settings}>
                {/* Existing Progress Toggle */}
                <TouchableOpacity
                  style={styles.existingProgressToggle}
                  onPress={() => setHasExistingProgress(!hasExistingProgress)}
                >
                  <Ionicons 
                    name={hasExistingProgress ? 'checkbox' : 'square-outline'} 
                    size={22} 
                    color={hasExistingProgress ? '#3B82F6' : '#9CA3AF'} 
                  />
                  <Text style={styles.existingProgressLabel}>
                    J'ai déjà commencé ce cours
                  </Text>
                </TouchableOpacity>

                {hasExistingProgress && (selectedMethod === 'j_method' || selectedMethod === 'srs') && (
                  <View style={styles.existingProgressSection}>
                    {selectedMethod === 'j_method' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Où en êtes-vous ? (ex: J60)</Text>
                        <View style={styles.jDayInputRow}>
                          <Text style={styles.jDayPrefix}>J</Text>
                          <TextInput
                            style={styles.jDayInput}
                            value={existingJDay}
                            onChangeText={setExistingJDay}
                            keyboardType="number-pad"
                            placeholder="0"
                            placeholderTextColor="#9CA3AF"
                          />
                        </View>
                        <Text style={styles.existingProgressHint}>
                          Les sessions passées seront ignorées
                        </Text>
                      </View>
                    )}
                    {selectedMethod === 'srs' && (
                      <>
                        <Text style={styles.existingProgressNote}>
                          Indiquez l'intervalle actuel entre vos révisions.
                          Le système s'adaptera après votre première notation.
                        </Text>
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Intervalle actuel (jours)</Text>
                          <TextInput
                            style={styles.input}
                            value={existingSRSInterval}
                            onChangeText={setExistingSRSInterval}
                            keyboardType="number-pad"
                            placeholder="1"
                            placeholderTextColor="#9CA3AF"
                          />
                          <Text style={styles.inputHint}>
                            Ex: si vous révisez tous les 7 jours, mettez 7
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                )}

                <Text style={styles.settingsTitle}>
                  <Ionicons name="settings-outline" size={16} color="#374151" /> Paramètres
                </Text>

                {/* Date picker */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    {hasExistingProgress ? 'Date de la prochaine révision' : 'Date de début (J0)'}
                  </Text>
                  <TouchableOpacity 
                    style={styles.datePickerButton}
                    onPress={() => setShowCalendar(!showCalendar)}
                  >
                    <Ionicons name="calendar" size={20} color="#3B82F6" />
                    <Text style={styles.datePickerText}>
                      {format(new Date(startDate), 'dd MMMM yyyy', { locale: fr })}
                    </Text>
                    <Ionicons name={showCalendar ? 'chevron-up' : 'chevron-down'} size={20} color="#6B7280" />
                  </TouchableOpacity>
                  {showCalendar && (
                    <View style={styles.calendarContainer}>
                      <Calendar
                        current={startDate}
                        onDayPress={(day: any) => {
                          setStartDate(day.dateString);
                          setShowCalendar(false);
                        }}
                        markedDates={{
                          [startDate]: { selected: true, selectedColor: '#3B82F6' }
                        }}
                        theme={{
                          todayTextColor: '#3B82F6',
                          selectedDayBackgroundColor: '#3B82F6',
                          arrowColor: '#3B82F6',
                        }}
                      />
                    </View>
                  )}
                </View>

                {/* J-Method specific settings */}
                {selectedMethod === 'j_method' && (
                  <>
                    {/* Presets */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Intervalles prédéfinis</Text>
                      <View style={styles.presetsRow}>
                        {Object.entries(J_PRESETS).map(([key, preset]) => (
                          <TouchableOpacity
                            key={key}
                            style={[styles.presetButton, selectedPreset === key && styles.presetButtonActive]}
                            onPress={() => applyPreset(key)}
                          >
                            <Text style={[styles.presetButtonText, selectedPreset === key && styles.presetButtonTextActive]}>
                              {preset.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* Custom intervals toggle */}
                    <TouchableOpacity
                      style={[styles.customIntervalsToggle, showCustomIntervals && styles.customIntervalsToggleActive]}
                      onPress={() => setShowCustomIntervals(!showCustomIntervals)}
                    >
                      <Ionicons name="create-outline" size={18} color="#3B82F6" />
                      <Text style={styles.customIntervalsLabel}>
                        {showCustomIntervals ? 'Masquer les intervalles' : `Modifier: ${customIntervals.map(i => `J${i}`).join(', ')}`}
                      </Text>
                      <Ionicons name={showCustomIntervals ? 'chevron-up' : 'chevron-down'} size={18} color="#6B7280" />
                    </TouchableOpacity>

                    {showCustomIntervals && (
                      <View style={styles.customIntervalsSection}>
                        <View style={styles.intervalsGrid}>
                          {customIntervals.map((interval, idx) => (
                            <View key={idx} style={styles.intervalItem}>
                              <Text style={styles.intervalLabel}>J</Text>
                              <TextInput
                                style={styles.intervalInput}
                                value={interval.toString()}
                                onChangeText={(val) => updateInterval(idx, val)}
                                keyboardType="number-pad"
                              />
                              {customIntervals.length > 2 && (
                                <TouchableOpacity onPress={() => removeInterval(idx)}>
                                  <Ionicons name="close-circle" size={20} color="#EF4444" />
                                </TouchableOpacity>
                              )}
                            </View>
                          ))}
                        </View>
                        <TouchableOpacity style={styles.addIntervalButton} onPress={addInterval}>
                          <Ionicons name="add" size={18} color="#3B82F6" />
                          <Text style={styles.addIntervalText}>Ajouter un intervalle</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Recurring review option */}
                    <View style={styles.recurringSection}>
                      <TouchableOpacity
                        style={styles.recurringToggle}
                        onPress={() => setEnableRecurring(!enableRecurring)}
                      >
                        <Ionicons 
                          name={enableRecurring ? 'checkbox' : 'square-outline'} 
                          size={22} 
                          color={enableRecurring ? '#10B981' : '#9CA3AF'} 
                        />
                        <Text style={styles.recurringLabel}>
                          Révision périodique après J{customIntervals[customIntervals.length - 1]}
                        </Text>
                      </TouchableOpacity>
                      {enableRecurring && (
                        <View style={styles.recurringInputRow}>
                          <Text style={styles.recurringText}>Revoir tous les</Text>
                          <TextInput
                            style={styles.recurringInput}
                            value={recurringInterval}
                            onChangeText={setRecurringInterval}
                            keyboardType="number-pad"
                          />
                          <Text style={styles.recurringText}>jours</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Tours method settings */}
                {selectedMethod === 'tours' && (
                  <>
                    <View style={styles.inputRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.inputLabel}>Nombre de tours</Text>
                        <TextInput
                          style={styles.input}
                          value={totalTours}
                          onChangeText={setTotalTours}
                          keyboardType="number-pad"
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.inputLabel}>Jours par tour</Text>
                        <TextInput
                          style={styles.input}
                          value={tourDuration}
                          onChangeText={setTourDuration}
                          keyboardType="number-pad"
                        />
                      </View>
                    </View>
                    <Text style={styles.toursHint}>
                      <Ionicons name="information-circle" size={14} color="#F59E0B" /> 
                      {' '}Les cours du chapitre seront répartis automatiquement
                    </Text>
                  </>
                )}

                {/* Preview */}
                {previewDates.length > 0 && (
                  <View style={styles.preview}>
                    <Text style={styles.previewTitle}>
                      <Ionicons name="calendar-outline" size={14} color="#6B7280" /> Aperçu du planning
                    </Text>
                    <View style={styles.previewList}>
                      {previewDates.map((item, idx) => (
                        <View key={idx} style={[styles.previewItem, item.isPast && styles.previewItemPast]}>
                          <View style={[
                            styles.previewDot, 
                            { backgroundColor: item.isPast ? '#9CA3AF' : item.isToday ? '#F59E0B' : selectedMethod === 'j_method' ? '#3B82F6' : selectedMethod === 'srs' ? '#8B5CF6' : '#10B981' }
                          ]} />
                          <Text style={[styles.previewLabel, item.isPast && styles.previewLabelPast]}>
                            {item.label}
                          </Text>
                          <Text style={[styles.previewDate, item.isPast && styles.previewDatePast]}>
                            {item.date} {item.isPast && '✓'}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>
              {selectedMethod === 'none' ? 'Désactiver' : 'Activer la révision'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    maxHeight: '90%',
    width: '95%',
    maxWidth: 500,
  },
  modalDesktop: {
    width: 520,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemTitle: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 16,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
  },
  methodSelected: {
    backgroundColor: '#EBF5FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  methodIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  methodIconText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  methodDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  settings: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  existingProgressToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  existingProgressLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  existingProgressSection: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  existingProgressHint: {
    fontSize: 12,
    color: '#92400E',
    marginTop: 6,
    fontStyle: 'italic',
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
  },
  jDayInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jDayPrefix: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3B82F6',
    marginRight: 4,
  },
  jDayInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1F2937',
    width: 80,
  },
  datePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    gap: 10,
  },
  datePickerText: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  calendarContainer: {
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  presetButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  presetButtonText: {
    fontSize: 13,
    color: '#374151',
  },
  presetButtonTextActive: {
    color: '#FFFFFF',
  },
  customIntervalsToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 8,
  },
  customIntervalsLabel: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  customIntervalsSection: {
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 10,
    marginTop: 8,
  },
  intervalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  intervalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  intervalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  intervalInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 6,
    padding: 6,
    width: 50,
    textAlign: 'center',
    fontSize: 14,
  },
  addIntervalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
  },
  addIntervalText: {
    fontSize: 13,
    color: '#3B82F6',
  },
  recurringSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  recurringToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  recurringLabel: {
    fontSize: 14,
    color: '#374151',
  },
  recurringInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  recurringText: {
    fontSize: 14,
    color: '#6B7280',
  },
  recurringInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 8,
    width: 60,
    textAlign: 'center',
    fontSize: 14,
  },
  toursHint: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 8,
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
  },
  preview: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  previewList: {
    gap: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewItemPast: {
    opacity: 0.5,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    width: 120,
  },
  previewLabelPast: {
    textDecorationLine: 'line-through',
  },
  previewDate: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  previewDatePast: {
    textDecorationLine: 'line-through',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  existingProgressNote: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    lineHeight: 18,
  },
  inputHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
    fontStyle: 'italic',
  },
});
