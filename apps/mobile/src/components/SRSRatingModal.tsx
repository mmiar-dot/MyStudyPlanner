import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SRSRatingModalProps {
  visible: boolean;
  onClose: () => void;
  onRate: (rating: number) => void;
  itemTitle: string;
}

const ratings = [
  { value: 0, label: 'Oublié', description: 'Aucun souvenir', color: '#EF4444', icon: 'close-circle' },
  { value: 1, label: 'Très difficile', description: 'Erreur grave', color: '#F97316', icon: 'alert-circle' },
  { value: 2, label: 'Difficile', description: 'Erreur mineure', color: '#EAB308', icon: 'remove-circle' },
  { value: 3, label: 'Hésitant', description: 'Correct avec effort', color: '#84CC16', icon: 'help-circle' },
  { value: 4, label: 'Correct', description: 'Bonne réponse', color: '#22C55E', icon: 'checkmark-circle' },
  { value: 5, label: 'Facile', description: 'Réponse immédiate', color: '#10B981', icon: 'star' },
];

export const SRSRatingModal: React.FC<SRSRatingModalProps> = ({
  visible,
  onClose,
  onRate,
  itemTitle,
}) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.modal, isDesktop && styles.modalDesktop]}>
          <View style={styles.header}>
            <Text style={styles.title}>Évaluer votre révision</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.itemTitle}>{itemTitle}</Text>
          
          <Text style={styles.subtitle}>Comment s'est passée cette révision ?</Text>

          <ScrollView 
            horizontal={false} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={[styles.ratingsContainer, isDesktop && styles.ratingsContainerDesktop]}>
              {ratings.map((rating) => (
                <TouchableOpacity
                  key={rating.value}
                  style={[
                    styles.ratingButton,
                    isDesktop && styles.ratingButtonDesktop,
                    { borderColor: rating.color }
                  ]}
                  onPress={() => onRate(rating.value)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.ratingIcon, { backgroundColor: rating.color }]}>
                    <Ionicons name={rating.icon as any} size={28} color="#FFF" />
                  </View>
                  <View style={styles.ratingTextContainer}>
                    <View style={styles.ratingHeader}>
                      <Text style={[styles.ratingValue, { color: rating.color }]}>{rating.value}</Text>
                      <Text style={styles.ratingLabel}>{rating.label}</Text>
                    </View>
                    <Text style={styles.ratingDescription}>{rating.description}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <View style={styles.hintContainer}>
            <View style={styles.hintRow}>
              <Ionicons name="refresh" size={16} color="#EF4444" />
              <Text style={styles.hintText}>0-2 : Révision bientôt (intervalle réinitialisé)</Text>
            </View>
            <View style={styles.hintRow}>
              <Ionicons name="trending-up" size={16} color="#10B981" />
              <Text style={styles.hintText}>3-5 : Intervalle augmente progressivement</Text>
            </View>
          </View>
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
    padding: 24,
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  modalDesktop: {
    width: 480,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  itemTitle: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  scrollContent: {
    paddingBottom: 8,
  },
  ratingsContainer: {
    gap: 10,
  },
  ratingsContainerDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    gap: 14,
  },
  ratingButtonDesktop: {
    width: '48%',
    marginBottom: 10,
  },
  ratingIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingTextContainer: {
    flex: 1,
  },
  ratingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  ratingValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  ratingLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  ratingDescription: {
    fontSize: 13,
    color: '#6B7280',
  },
  hintContainer: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    gap: 8,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hintText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
});
