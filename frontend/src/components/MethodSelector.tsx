import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../types';
import { format } from 'date-fns';
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
  const [selectedMethod, setSelectedMethod] = useState<RevisionMethod>(currentMethod || 'none');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [totalTours, setTotalTours] = useState('3');
  const [tourDuration, setTourDuration] = useState('30');

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
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Méthode de révision</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTitle}>{itemTitle}</Text>

          <ScrollView style={styles.content}>
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
                <Text style={styles.methodDesc}>J0 J1 J3 J7 J14 J30 J60 J120</Text>
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
                <Text style={styles.methodDesc}>Algorithme SM-2 adaptatif</Text>
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
                <Text style={styles.methodDesc}>Plusieurs passages planifiés</Text>
              </View>
              {selectedMethod === 'tours' && (
                <Ionicons name="checkmark-circle" size={24} color="#3B82F6" />
              )}
            </TouchableOpacity>

            {/* Settings based on method */}
            {selectedMethod !== 'none' && (
              <View style={styles.settings}>
                <Text style={styles.settingsTitle}>Paramètres</Text>

                {(selectedMethod === 'j_method' || selectedMethod === 'srs') && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Date de début</Text>
                    <TextInput
                      style={styles.input}
                      value={startDate}
                      onChangeText={setStartDate}
                      placeholder="YYYY-MM-DD"
                    />
                  </View>
                )}

                {selectedMethod === 'tours' && (
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Nombre de tours</Text>
                      <TextInput
                        style={styles.input}
                        value={totalTours}
                        onChangeText={setTotalTours}
                        keyboardType="number-pad"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.inputLabel}>Durée par tour (jours)</Text>
                      <TextInput
                        style={styles.input}
                        value={tourDuration}
                        onChangeText={setTourDuration}
                        keyboardType="number-pad"
                      />
                    </View>
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <Text style={styles.confirmText}>Confirmer</Text>
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
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
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
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '500',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
  },
  content: {
    padding: 20,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  methodDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  settings: {
    marginTop: 20,
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
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    margin: 20,
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
