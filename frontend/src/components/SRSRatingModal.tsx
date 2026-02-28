import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SRSRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onRate: (rating: number) => void;
  itemTitle: string;
}

const ratings = [
  { value: 0, label: 'Oublié', color: '#EF4444', icon: 'close-circle' },
  { value: 1, label: 'Très difficile', color: '#F97316', icon: 'alert-circle' },
  { value: 2, label: 'Difficile', color: '#EAB308', icon: 'remove-circle' },
  { value: 3, label: 'Hésitant', color: '#84CC16', icon: 'help-circle' },
  { value: 4, label: 'Correct', color: '#22C55E', icon: 'checkmark-circle' },
  { value: 5, label: 'Facile', color: '#10B981', icon: 'star' },
];

export const SRSRatingModal: React.FC<SRSRatingModalProps> = ({
  visible,
  onClose,
  onRate,
  itemTitle,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Évaluer votre révision</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTitle}>{itemTitle}</Text>

          <View style={styles.ratingsContainer}>
            {ratings.map((rating) => (
              <TouchableOpacity
                key={rating.value}
                style={styles.ratingButton}
                onPress={() => onRate(rating.value)}
              >
                <View style={[styles.ratingIcon, { backgroundColor: rating.color }]}>
                  <Ionicons name={rating.icon as any} size={24} color="#FFF" />
                </View>
                <Text style={styles.ratingValue}>{rating.value}</Text>
                <Text style={styles.ratingLabel}>{rating.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.hint}>
            0-2 : La carte sera revue bientôt{"\n"}
            3-5 : L'intervalle augmente progressivement
          </Text>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
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
    marginBottom: 24,
    textAlign: 'center',
  },
  ratingsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  ratingButton: {
    width: '30%',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  ratingIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  ratingLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  hint: {
    marginTop: 24,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
