import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import api from '../src/services/api';

interface AdminUser {
  id: string;
  email: string;
  role: string;
  is_blocked: boolean;
  created_at?: string;
  last_login?: string;
  sessions_count: number;
  courses_count: number;
}

interface Feedback {
  id: string;
  user_id: string;
  user_email: string;
  type: string;
  message: string;
  status: string;
  created_at: string;
}

interface FeedbackCount {
  total: number;
  pending: number;
  bugs: number;
  suggestions: number;
}

interface CatalogItem {
  id: string;
  title: string;
  parent_id: string | null;
  level: number;
  order: number;
  description?: string;
  children_count?: number;
}

export default function AdminScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [feedbackCount, setFeedbackCount] = useState<FeedbackCount>({ total: 0, pending: 0, bugs: 0, suggestions: 0 });
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'block' | 'unblock' | 'delete'>('block');
  const [blockReason, setBlockReason] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'feedback' | 'courses'>('users');
  
  // Course form state
  const [courseTitle, setCourseTitle] = useState('');
  const [courseParentId, setCourseParentId] = useState<string | null>(null);
  const [courseDescription, setCourseDescription] = useState('');
  const [editingCourse, setEditingCourse] = useState<CatalogItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    await Promise.all([loadUsers(), loadFeedback(), loadCatalog()]);
    setIsLoading(false);
  };

  const loadUsers = async () => {
    try {
      const response = await api.get<AdminUser[]>('/admin/users');
      setUsers(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Accès refusé', 'Vous n\'avez pas les droits d\'administration');
        router.push('/(tabs)/profile');
      }
    }
  };

  const loadFeedback = async () => {
    try {
      const [feedbackRes, countRes] = await Promise.all([
        api.get<Feedback[]>('/admin/feedback'),
        api.get<FeedbackCount>('/admin/feedback/count')
      ]);
      setFeedbackList(feedbackRes.data);
      setFeedbackCount(countRes.data);
    } catch (error) {
      console.log('Feedback load error:', error);
    }
  };

  const loadCatalog = async () => {
    try {
      const response = await api.get<CatalogItem[]>('/catalog/all');
      // Filter only admin items (no owner_id)
      const adminItems = response.data.filter((item: any) => !item.owner_id);
      setCatalogItems(adminItems);
    } catch (error) {
      console.log('Catalog load error:', error);
    }
  };

  const handleCreateCourse = async () => {
    if (!courseTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/admin/catalog', {
        title: courseTitle.trim(),
        parent_id: courseParentId,
        description: courseDescription.trim() || undefined
      });
      Alert.alert('Succès', 'Cours créé avec succès');
      resetCourseForm();
      loadCatalog();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async () => {
    if (!editingCourse || !courseTitle.trim()) return;
    setIsSubmitting(true);
    try {
      await api.put(`/admin/catalog/${editingCourse.id}`, {
        title: courseTitle.trim(),
        description: courseDescription.trim() || undefined
      });
      Alert.alert('Succès', 'Cours modifié avec succès');
      resetCourseForm();
      loadCatalog();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async (item: CatalogItem) => {
    const confirmDelete = () => {
      api.delete(`/admin/catalog/${item.id}`)
        .then(() => {
          Alert.alert('Succès', 'Cours supprimé');
          loadCatalog();
        })
        .catch(() => Alert.alert('Erreur', 'Impossible de supprimer'));
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Supprimer "${item.title}" et tous ses sous-éléments ?`)) {
        confirmDelete();
      }
    } else {
      Alert.alert(
        'Confirmer la suppression',
        `Supprimer "${item.title}" et tous ses sous-éléments ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Supprimer', style: 'destructive', onPress: confirmDelete }
        ]
      );
    }
  };

  const openEditCourse = (item: CatalogItem) => {
    setEditingCourse(item);
    setCourseTitle(item.title);
    setCourseDescription(item.description || '');
    setCourseParentId(item.parent_id);
    setShowCourseModal(true);
  };

  const resetCourseForm = () => {
    setShowCourseModal(false);
    setEditingCourse(null);
    setCourseTitle('');
    setCourseDescription('');
    setCourseParentId(null);
  };

  // Get chapters (level 0) for parent selection
  const chapters = catalogItems.filter(item => item.level === 0);

  const updateFeedbackStatus = async (feedbackId: string, status: string) => {
    try {
      await api.put(`/admin/feedback/${feedbackId}/status?status=${status}`);
      loadFeedback();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour le statut');
    }
  };

  const deleteFeedback = async (feedbackId: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm('Supprimer ce signalement ?')) {
        try {
          await api.delete(`/admin/feedback/${feedbackId}`);
          loadFeedback();
        } catch (error) {
          Alert.alert('Erreur', 'Impossible de supprimer');
        }
      }
    } else {
      Alert.alert('Confirmer', 'Supprimer ce signalement ?', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/admin/feedback/${feedbackId}`);
            loadFeedback();
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de supprimer');
          }
        }}
      ]);
    }
  };

  const handleBlockUser = async () => {
    if (!selectedUser) return;
    try {
      await api.post(`/admin/users/${selectedUser.id}/block`, { reason: blockReason });
      Alert.alert('Succès', 'Utilisateur bloqué');
      setShowConfirmModal(false);
      setShowUserModal(false);
      setBlockReason('');
      loadUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de bloquer l\'utilisateur');
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedUser) return;
    try {
      await api.post(`/admin/users/${selectedUser.id}/unblock`);
      Alert.alert('Succès', 'Utilisateur débloqué');
      setShowConfirmModal(false);
      setShowUserModal(false);
      loadUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de débloquer l\'utilisateur');
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    try {
      const response = await api.delete(`/admin/users/${selectedUser.id}`);
      Alert.alert('Succès', 'Utilisateur et toutes ses données supprimés (RGPD)');
      setShowConfirmModal(false);
      setShowUserModal(false);
      loadUsers();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer l\'utilisateur');
    }
  };

  const openConfirmModal = (action: 'block' | 'unblock' | 'delete') => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const executeConfirmAction = () => {
    switch (confirmAction) {
      case 'block':
        handleBlockUser();
        break;
      case 'unblock':
        handleUnblockUser();
        break;
      case 'delete':
        handleDeleteUser();
        break;
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Administration</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="people" size={24} color="#3B82F6" />
          <Text style={styles.statNumber}>{users.length}</Text>
          <Text style={styles.statLabel}>Utilisateurs</Text>
        </View>
        <View style={[styles.statCard, feedbackCount.pending > 0 && styles.statCardWarning]}>
          <Ionicons name="flag" size={24} color={feedbackCount.pending > 0 ? '#F59E0B' : '#6B7280'} />
          <Text style={[styles.statNumber, feedbackCount.pending > 0 && styles.statNumberWarning]}>{feedbackCount.pending}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="bug" size={24} color="#EF4444" />
          <Text style={styles.statNumber}>{feedbackCount.bugs}</Text>
          <Text style={styles.statLabel}>Bugs</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="bulb" size={24} color="#10B981" />
          <Text style={styles.statNumber}>{feedbackCount.suggestions}</Text>
          <Text style={styles.statLabel}>Suggestions</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'users' && styles.tabActive]}
          onPress={() => setActiveTab('users')}
        >
          <Ionicons name="people" size={20} color={activeTab === 'users' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'users' && styles.tabTextActive]}>Utilisateurs</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'feedback' && styles.tabActive]}
          onPress={() => setActiveTab('feedback')}
        >
          <Ionicons name="chatbox" size={20} color={activeTab === 'feedback' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.tabTextActive]}>Signalements</Text>
          {feedbackCount.pending > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{feedbackCount.pending}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'courses' && styles.tabActive]}
          onPress={() => setActiveTab('courses')}
        >
          <Ionicons name="book" size={20} color={activeTab === 'courses' ? '#3B82F6' : '#6B7280'} />
          <Text style={[styles.tabText, activeTab === 'courses' && styles.tabTextActive]}>Cours</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : activeTab === 'users' ? (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>
            {users.length} utilisateur{users.length > 1 ? 's' : ''} inscrit{users.length > 1 ? 's' : ''}
          </Text>

          {users.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[styles.userCard, user.is_blocked && styles.userCardBlocked]}
              onPress={() => {
                setSelectedUser(user);
                setShowUserModal(true);
              }}
            >
              <View style={styles.userInfo}>
                <View style={styles.userHeader}>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  {user.role === 'admin' && (
                    <View style={styles.adminBadge}>
                      <Ionicons name="shield-checkmark" size={12} color="#8B5CF6" />
                      <Text style={styles.adminBadgeText}>Admin</Text>
                    </View>
                  )}
                  {user.is_blocked && (
                    <View style={styles.blockedBadge}>
                      <Ionicons name="ban" size={12} color="#EF4444" />
                      <Text style={styles.blockedBadgeText}>Bloqué</Text>
                    </View>
                  )}
                </View>
                <View style={styles.userStats}>
                  <Text style={styles.userStat}>
                    <Ionicons name="calendar" size={12} color="#6B7280" /> {user.sessions_count} sessions
                  </Text>
                  <Text style={styles.userStat}>
                    <Ionicons name="book" size={12} color="#6B7280" /> {user.courses_count} cours
                  </Text>
                </View>
                <Text style={styles.userDate}>
                  Inscrit le {formatDate(user.created_at)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>
            {feedbackList.length} signalement{feedbackList.length > 1 ? 's' : ''}
          </Text>

          {feedbackList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              <Text style={styles.emptyStateText}>Aucun signalement</Text>
            </View>
          ) : (
            feedbackList.map((fb) => (
              <View key={fb.id} style={[styles.feedbackCard, fb.status === 'pending' && styles.feedbackCardPending]}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackType}>
                    <Ionicons 
                      name={fb.type === 'bug' ? 'bug' : fb.type === 'suggestion' ? 'bulb' : 'chatbox'} 
                      size={18} 
                      color={fb.type === 'bug' ? '#EF4444' : fb.type === 'suggestion' ? '#F59E0B' : '#3B82F6'} 
                    />
                    <Text style={styles.feedbackTypeText}>
                      {fb.type === 'bug' ? 'Bug' : fb.type === 'suggestion' ? 'Suggestion' : 'Autre'}
                    </Text>
                  </View>
                  <Text style={[styles.feedbackStatus, fb.status === 'pending' && styles.feedbackStatusPending]}>
                    {fb.status === 'pending' ? 'En attente' : fb.status === 'resolved' ? 'Résolu' : fb.status}
                  </Text>
                </View>
                
                <Text style={styles.feedbackMessage}>{fb.message}</Text>
                
                <View style={styles.feedbackFooter}>
                  <Text style={styles.feedbackMeta}>
                    {fb.user_email} • {new Date(fb.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                  <View style={styles.feedbackActions}>
                    {fb.status === 'pending' && (
                      <TouchableOpacity 
                        style={styles.feedbackActionBtn}
                        onPress={() => updateFeedbackStatus(fb.id, 'resolved')}
                      >
                        <Ionicons name="checkmark" size={18} color="#10B981" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                      style={styles.feedbackActionBtn}
                      onPress={() => deleteFeedback(fb.id)}
                    >
                      <Ionicons name="trash" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* User Detail Modal */}
      <Modal visible={showUserModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Détails utilisateur</Text>
              <TouchableOpacity onPress={() => setShowUserModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedUser.email}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Rôle</Text>
                  <Text style={styles.detailValue}>{selectedUser.role}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Statut</Text>
                  <Text style={[styles.detailValue, selectedUser.is_blocked && { color: '#EF4444' }]}>
                    {selectedUser.is_blocked ? 'Bloqué' : 'Actif'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sessions créées</Text>
                  <Text style={styles.detailValue}>{selectedUser.sessions_count}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Cours configurés</Text>
                  <Text style={styles.detailValue}>{selectedUser.courses_count}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Inscrit le</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUser.created_at)}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dernière connexion</Text>
                  <Text style={styles.detailValue}>{formatDate(selectedUser.last_login)}</Text>
                </View>

                {selectedUser.role !== 'admin' && (
                  <View style={styles.actionsSection}>
                    <Text style={styles.actionsSectionTitle}>Actions</Text>
                    
                    {selectedUser.is_blocked ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.unblockButton]}
                        onPress={() => openConfirmModal('unblock')}
                      >
                        <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                        <Text style={styles.unblockButtonText}>Débloquer l'utilisateur</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.blockButton]}
                        onPress={() => openConfirmModal('block')}
                      >
                        <Ionicons name="ban" size={20} color="#F59E0B" />
                        <Text style={styles.blockButtonText}>Bloquer l'utilisateur</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => openConfirmModal('delete')}
                    >
                      <Ionicons name="trash" size={20} color="#EF4444" />
                      <Text style={styles.deleteButtonText}>Supprimer le compte (RGPD)</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <Ionicons 
              name={confirmAction === 'delete' ? 'warning' : confirmAction === 'block' ? 'ban' : 'checkmark-circle'} 
              size={48} 
              color={confirmAction === 'delete' ? '#EF4444' : confirmAction === 'block' ? '#F59E0B' : '#10B981'} 
            />
            <Text style={styles.confirmTitle}>
              {confirmAction === 'delete' && 'Supprimer le compte ?'}
              {confirmAction === 'block' && 'Bloquer l\'utilisateur ?'}
              {confirmAction === 'unblock' && 'Débloquer l\'utilisateur ?'}
            </Text>
            <Text style={styles.confirmText}>
              {confirmAction === 'delete' && 'Cette action est irréversible. Toutes les données de l\'utilisateur seront définitivement supprimées (sessions, cours, événements...).'}
              {confirmAction === 'block' && 'L\'utilisateur ne pourra plus se connecter à l\'application.'}
              {confirmAction === 'unblock' && 'L\'utilisateur pourra à nouveau se connecter.'}
            </Text>

            {confirmAction === 'block' && (
              <TextInput
                style={styles.reasonInput}
                placeholder="Raison du blocage (optionnel)"
                value={blockReason}
                onChangeText={setBlockReason}
                multiline
              />
            )}

            <View style={styles.confirmButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowConfirmModal(false);
                  setBlockReason('');
                }}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  confirmAction === 'delete' && styles.confirmDeleteButton,
                  confirmAction === 'block' && styles.confirmBlockButton,
                  confirmAction === 'unblock' && styles.confirmUnblockButton,
                ]}
                onPress={executeConfirmAction}
              >
                <Text style={styles.confirmButtonText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  refreshButton: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userCardBlocked: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  blockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  blockedBadgeText: {
    fontSize: 11,
    color: '#EF4444',
    fontWeight: '500',
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  userStat: {
    fontSize: 13,
    color: '#6B7280',
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  actionsSection: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionsSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    gap: 8,
  },
  blockButton: {
    backgroundColor: '#FEF3C7',
  },
  blockButtonText: {
    color: '#D97706',
    fontWeight: '500',
  },
  unblockButton: {
    backgroundColor: '#D1FAE5',
  },
  unblockButtonText: {
    color: '#059669',
    fontWeight: '500',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '500',
  },
  confirmModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  reasonInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#6B7280',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmDeleteButton: {
    backgroundColor: '#EF4444',
  },
  confirmBlockButton: {
    backgroundColor: '#F59E0B',
  },
  confirmUnblockButton: {
    backgroundColor: '#10B981',
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  // Stats row
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statCardWarning: {
    backgroundColor: '#FEF3C7',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 4,
  },
  statNumberWarning: {
    color: '#F59E0B',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  // Tabs
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  // Feedback card
  feedbackCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  feedbackCardPending: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedbackType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTypeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  feedbackStatus: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '500',
  },
  feedbackStatusPending: {
    color: '#F59E0B',
  },
  feedbackMessage: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
    marginBottom: 12,
  },
  feedbackFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  feedbackMeta: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  feedbackActions: {
    flexDirection: 'row',
    gap: 12,
  },
  feedbackActionBtn: {
    padding: 6,
  },
});
