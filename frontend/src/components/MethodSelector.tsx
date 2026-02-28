import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import { RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../types';
import { format, addDays } from 'date-fns';
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
}

const DEFAULT_J_INTERVALS = [0, 1, 3, 7, 14, 30, 60, 120];

export const MethodSelector: React.FC<MethodSelectorProps> = ({
  visible,
  onClose,
  onSelect,
  itemTitle,
  currentMethod,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const [selectedMethod, setSelectedMethod] = useState<RevisionMethod>(currentMethod || 'none');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalTours, setTotalTours] = useState('3');
  const [tourDuration, setTourDuration] = useState('30');

  // Calculate preview dates
  const previewDates = useMemo(() => {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return [];
    
    if (selectedMethod === 'j_method') {
      return DEFAULT_J_INTERVALS.map((interval, idx) => ({
        label: `J${interval}`,
        date: format(addDays(start, interval), 'dd MMM', { locale: fr })
      }));
    }
    
    if (selectedMethod === 'tours') {
      const tours = parseInt(totalTours) || 3;
      const duration = parseInt(tourDuration) || 30;
      const dates = [];
      let currentDate = start;
      
      for (let t = 1; t <= tours; t++) {
        dates.push({
          label: `Tour ${t}`,
          date: `${format(currentDate, 'dd MMM', { locale: fr })} - ${format(addDays(currentDate, duration - 1), 'dd MMM', { locale: fr })}`
        });
        currentDate = addDays(currentDate, duration);
      }
      return dates;
    }
    
    if (selectedMethod === 'srs') {
      return [
        { label: 'Première révision', date: format(start, 'dd MMM', { locale: fr }) },
        { label: 'Si réussite (3-5)', date: '~6 jours après' },
        { label: 'Puis', date: 'Intervalle croissant' }
      ];
    }
    
    return [];
  }, [selectedMethod, startDate, totalTours, tourDuration]);

  const handleConfirm = () => {
    let jSettings: JMethodSettings | undefined;
    let srsSettings: SRSSettings | undefined;
    let toursSettings: ToursSettings | undefined;

    if (selectedMethod === 'j_method') {
      jSettings = {
        start_date: startDate,
        intervals: DEFAULT_J_INTERVALS,
        recurring_interval: 150,
      };
    } else if (selectedMethod === 'srs') {
      srsSettings = {
        easiness_factor: 2.5,
        interval: 1,
        repetitions: 0,
        next_review: startDate,
      };
    } else if (selectedMethod === 'tours') {
      const tours = parseInt(totalTours) || 3;
      const duration = parseInt(tourDuration) || 30;
      toursSettings = {
        total_tours: tours,
        tour_durations: Array(tours).fill(duration),
        current_tour: 1,
      };
    }

    onSelect(selectedMethod, jSettings, srsSettings, toursSettings);
    onClose();
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

            <TouchableOpacity
              style={[styles.methodOption, selectedMethod === 'tours' && styles.methodSelected]}
              onPress={() => setSelectedMethod('tours')}
            >
              <View style={[styles.methodIcon, { backgroundColor: '#10B981' }]}>
                <Ionicons name="repeat" size={20} color="#FFF" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodTitle}>Méthode des Tours</Text>
                <Text style={styles.methodDesc}>Plusieurs passages sur une période définie</Text>
              </View>
              {selectedMethod === 'tours' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

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
                <Text style={styles.settingsTitle}>
                  <Ionicons name="settings-outline" size={16} color="#374151" /> Paramètres
                </Text>

                {(selectedMethod === 'j_method' || selectedMethod === 'srs') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date de début</Text>
                    <TextInput
                      style={styles.input}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                )}

                {selectedMethod === 'tours' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Date de début</Text>
                      <TextInput
                        style={styles.input}
                        value={startDate}
                        onChangeText={setStartDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                    <View style={styles.inputRow}>
                      <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.inputLabel}>Nombre de tours</Text>
                        <TextInput
                          style={styles.input}
                          value={totalTours}
                          onChangeText={setTotalTours}
                          keyboardType="number-pad"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                      <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.inputLabel}>Jours par tour</Text>
                        <TextInput
                          style={styles.input}
                          value={tourDuration}
                          onChangeText={setTourDuration}
                          keyboardType="number-pad"
                          placeholderTextColor="#9CA3AF"
                        />
                      </View>
                    </View>
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
                        <View key={idx} style={styles.previewItem}>
                          <View style={[
                            styles.previewDot, 
                            { backgroundColor: selectedMethod === 'j_method' ? '#3B82F6' : selectedMethod === 'srs' ? '#8B5CF6' : '#10B981' }
                          ]} />
                          <Text style={styles.previewLabel}>{item.label}</Text>
                          <Text style={styles.previewDate}>{item.date}</Text>
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
    maxHeight: '85%',
    width: '95%',
    maxWidth: 500,
  },
  modalDesktop: {
    width: 500,
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
    width: 100,
  },
  previewDate: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
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
});
