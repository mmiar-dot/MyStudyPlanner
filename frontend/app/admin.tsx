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
import api from '../../src/services/api';

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

export default function AdminScreen() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'block' | 'unblock' | 'delete'>('block');
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setIsLoading(true);
      const response = await api.get<AdminUser[]>('/admin/users');
      setUsers(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert('Accès refusé', 'Vous n\'avez pas les droits d\'administration');
        router.back();
      } else {
        Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
      }
    } finally {
      setIsLoading(false);
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Gestion des utilisateurs</Text>
        <TouchableOpacity onPress={loadUsers} style={styles.refreshButton}>
          <Ionicons name="refresh" size={24} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Chargement des utilisateurs...</Text>
        </View>
      ) : (
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
});
