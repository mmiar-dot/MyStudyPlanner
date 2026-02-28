import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../../src/services/api';
import { CatalogItem } from '../../src/types';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminScreen() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemParent, setNewItemParent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const response = await api.get<CatalogItem[]>('/catalog/all');
      setItems(response.data);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const handleCreateItem = async () => {
    if (!newItemTitle.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.post('/admin/catalog', {
        title: newItemTitle.trim(),
        parent_id: newItemParent,
        order: items.filter((i) => i.parent_id === newItemParent).length,
      });
      setShowCreateModal(false);
      setNewItemTitle('');
      setNewItemParent(null);
      await fetchItems();
      Alert.alert('Succès', 'Cours créé avec succès');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de créer le cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = (item: CatalogItem) => {
    Alert.alert(
      'Supprimer',
      `Êtes-vous sûr de vouloir supprimer "${item.title}" ${item.children_count > 0 ? `et ses ${item.children_count} sous-éléments` : ''} ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/admin/catalog/${item.id}`);
              await fetchItems();
            } catch (error: any) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  const handleSeedData = async () => {
    Alert.alert(
      'Données de démo',
      'Voulez-vous ajouter des données de démonstration (chapitres et cours médicaux) ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Ajouter',
          onPress: async () => {
            try {
              setIsLoading(true);
              await api.post('/admin/seed');
              await fetchItems();
              Alert.alert('Succès', 'Données de démonstration ajoutées');
            } catch (error: any) {
              Alert.alert('Info', error.response?.data?.message || 'Erreur');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const chapters = items.filter((i) => i.level === 0);
  const getChildren = (parentId: string) => items.filter((i) => i.parent_id === parentId);

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={48} color="#EF4444" />
          <Text style={styles.accessDeniedText}>Accès refusé</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Administration</Text>
        <TouchableOpacity onPress={() => setShowCreateModal(true)}>
          <Ionicons name="add-circle" size={28} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
          }
        >
          {/* Seed Button */}
          {items.length === 0 && (
            <TouchableOpacity style={styles.seedButton} onPress={handleSeedData}>
              <Ionicons name="add" size={24} color="#3B82F6" />
              <Text style={styles.seedButtonText}>Ajouter des données de démo</Text>
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{chapters.length}</Text>
              <Text style={styles.statLabel}>Chapitres</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{items.filter((i) => i.level > 0).length}</Text>
              <Text style={styles.statLabel}>Cours</Text>
            </View>
          </View>

          {/* Items List */}
          {chapters.map((chapter) => {
            const children = getChildren(chapter.id);
            return (
              <View key={chapter.id} style={styles.chapterCard}>
                <View style={styles.chapterHeader}>
                  <View style={styles.chapterInfo}>
                    <Text style={styles.chapterTitle}>{chapter.title}</Text>
                    <Text style={styles.chapterCount}>{children.length} cours</Text>
                  </View>
                  <View style={styles.chapterActions}>
                    <TouchableOpacity
                      onPress={() => {
                        setNewItemParent(chapter.id);
                        setShowCreateModal(true);
                      }}
                    >
                      <Ionicons name="add" size={22} color="#3B82F6" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteItem(chapter)}>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {children.map((course) => (
                  <View key={course.id} style={styles.courseItem}>
                    <Text style={styles.courseTitle}>{course.title}</Text>
                    <TouchableOpacity onPress={() => handleDeleteItem(course)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Create Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {newItemParent ? 'Nouveau cours' : 'Nouveau chapitre'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCreateModal(false);
                  setNewItemTitle('');
                  setNewItemParent(null);
                }}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {newItemParent && (
              <Text style={styles.parentInfo}>
                Dans : {items.find((i) => i.id === newItemParent)?.title}
              </Text>
            )}

            <TextInput
              style={styles.input}
              placeholder="Titre"
              placeholderTextColor="#9CA3AF"
              value={newItemTitle}
              onChangeText={setNewItemTitle}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
              onPress={handleCreateItem}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Créer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backIcon: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 18,
    color: '#EF4444',
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  seedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  seedButtonText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  chapterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  chapterCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  chapterActions: {
    flexDirection: 'row',
    gap: 16,
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  courseTitle: {
    fontSize: 15,
    color: '#374151',
    flex: 1,
  },
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  parentInfo: {
    fontSize: 14,
    color: '#3B82F6',
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
