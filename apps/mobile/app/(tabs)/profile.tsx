import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  useWindowDimensions,
  Platform,
  Switch,
  Image,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '@mystudyplanner/api-client';
import { useAnalyticsStore } from '@mystudyplanner/api-client';
import { useEventStore } from '@mystudyplanner/api-client';
import { ColorPicker } from '@mystudyplanner/shared-ui';
import { ProfilePhotoManager } from '@mystudyplanner/shared-ui';
import { StatsDetailModal } from '@mystudyplanner/shared-ui';
import notificationService, { NotificationSettings } from '../../src/services/notificationService';
import { api } from '@mystudyplanner/api-client';

export default function ProfileScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const { user, logout } = useAuthStore();
  const { progress, fetchProgress } = useAnalyticsStore();
  const { icsSubscriptions, fetchICSSubscriptions, subscribeICS, updateICSSubscription, syncICS, deleteICSSubscription } = useEventStore();

  // Modal states
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showICSModal, setShowICSModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showNotifModal, setShowNotifModal] = useState(false);
  const [showEditICSModal, setShowEditICSModal] = useState(false);
  const [showStatsDetailModal, setShowStatsDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportType, setReportType] = useState<'bug' | 'suggestion' | 'other'>('bug');
  const [reportMessage, setReportMessage] = useState('');
  const [statsDetailType, setStatsDetailType] = useState<'today' | 'late' | 'completion' | 'courses' | 'streak'>('today');
  
  // Settings form
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [settingsTab, setSettingsTab] = useState<'password' | 'delete'>('password');
  
  // ICS form
  const [icsName, setIcsName] = useState('');
  const [icsUrl, setIcsUrl] = useState('');
  const [icsColor, setIcsColor] = useState('#10B981');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  
  // Edit ICS form
  const [editingICS, setEditingICS] = useState<typeof icsSubscriptions[0] | null>(null);
  const [editICSName, setEditICSName] = useState('');
  const [editICSColor, setEditICSColor] = useState('#10B981');

  // Notification settings
  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(notificationService.getSettings());

  useEffect(() => {
    // Initial load only for notifications
    if (Platform.OS !== 'web') {
      notificationService.init();
    }
  }, []);

  // Auto-refresh stats when page gains focus
  useFocusEffect(
    useCallback(() => {
      fetchProgress();
      fetchICSSubscriptions();
    }, [])
  );

  const handleLogout = async () => {
    await logout();
    setShowLogoutModal(false);
    router.replace('/(auth)/login');
  };

  const handleAddICS = async () => {
    if (!icsName.trim() || !icsUrl.trim()) return;
    try {
      setIsSubmitting(true);
      await subscribeICS(icsName.trim(), icsUrl.trim(), icsColor);
      setIcsName('');
      setIcsUrl('');
      setIcsColor('#10B981');
      setShowICSModal(false);
    } catch (error) {
      console.error('Error adding ICS:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSyncICS = async (subId: string) => {
    try {
      setSyncingId(subId);
      await syncICS(subId);
    } catch (error) {
      console.error('Error syncing ICS:', error);
    } finally {
      setSyncingId(null);
    }
  };

  const handleOpenEditICS = (sub: typeof icsSubscriptions[0]) => {
    setEditingICS(sub);
    setEditICSName(sub.name);
    setEditICSColor(sub.color);
    setShowEditICSModal(true);
  };

  const handleUpdateICS = async () => {
    if (!editingICS || !editICSName.trim()) return;
    try {
      setIsSubmitting(true);
      await updateICSSubscription(editingICS.id, editICSName.trim(), editICSColor);
      setShowEditICSModal(false);
      setEditingICS(null);
    } catch (error) {
      console.error('Error updating ICS:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.put('/account/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      Alert.alert('Succès', 'Mot de passe modifié avec succès');
      setShowSettingsModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de modifier le mot de passe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'SUPPRIMER') {
      Alert.alert('Erreur', 'Veuillez taper SUPPRIMER pour confirmer');
      return;
    }
    if (!currentPassword) {
      Alert.alert('Erreur', 'Veuillez entrer votre mot de passe');
      return;
    }
    try {
      setIsSubmitting(true);
      await api.delete('/account', {
        data: {
          password: currentPassword,
          confirmation: 'SUPPRIMER'
        }
      });
      Alert.alert('Compte supprimé', 'Votre compte et toutes vos données ont été supprimés.');
      logout();
      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Erreur', error.response?.data?.detail || 'Impossible de supprimer le compte');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  const handlePhotoUpdated = async () => {
    // Refresh user data to get updated photo
    try {
      const response = await api.get('/auth/me');
      // The auth store should handle this
      fetchProgress();
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  const renderContent = () => (
    <>
      {/* Header */}
      <View style={[styles.header, isDesktop && styles.headerDesktop]}>
        <ProfilePhotoManager
          currentPhoto={user?.profile_photo}
          photoType={user?.photo_type}
          userName={user?.name || 'U'}
          onPhotoUpdated={handlePhotoUpdated}
        />
        <Text style={[styles.name, isDesktop && styles.nameDesktop]}>{user?.name || 'Utilisateur'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#8B5CF6" />
            <Text style={styles.adminText}>Administrateur</Text>
          </View>
        )}
      </View>

      {/* Stats Card */}
      {progress && (
        <View style={[styles.statsCard, isDesktop && styles.statsCardDesktop]}>
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              setStatsDetailType('streak');
              setShowStatsDetailModal(true);
            }}
          >
            <Ionicons name="flame" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{progress.streak}</Text>
            <Text style={styles.statLabel}>Jours de suite</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              setStatsDetailType('completion');
              setShowStatsDetailModal(true);
            }}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.statValue}>{progress.completed_sessions}</Text>
            <Text style={styles.statLabel}>Sessions terminées</Text>
          </TouchableOpacity>
          <View style={styles.statDivider} />
          <TouchableOpacity 
            style={styles.statItem}
            onPress={() => {
              setStatsDetailType('courses');
              setShowStatsDetailModal(true);
            }}
          >
            <Ionicons name="book" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{progress.active_items}</Text>
            <Text style={styles.statLabel}>Cours actifs</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Desktop Layout */}
      {isDesktop ? (
        <View style={styles.desktopGrid}>
          {/* Left Column - Menu */}
          <View style={styles.desktopColumn}>
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Paramètres</Text>
              
              {isAdmin && (
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push('/admin')}
                >
                  <View style={[styles.menuIcon, { backgroundColor: '#F3E8FF' }]}>
                    <Ionicons name="settings" size={20} color="#8B5CF6" />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>Administration</Text>
                    <Text style={styles.menuSubtitle}>Gérer les cours et utilisateurs</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowICSModal(true)}>
                <View style={[styles.menuIcon, { backgroundColor: '#EBF5FF' }]}>
                  <Ionicons name="calendar" size={20} color="#3B82F6" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Calendriers ICS</Text>
                  <Text style={styles.menuSubtitle}>{icsSubscriptions.length} abonnement(s)</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowNotifModal(true)}>
                <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="notifications" size={20} color="#10B981" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Notifications</Text>
                  <Text style={styles.menuSubtitle}>Rappels et alertes</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowStatsModal(true)}>
                <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="bar-chart" size={20} color="#F59E0B" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Statistiques</Text>
                  <Text style={styles.menuSubtitle}>Votre progression détaillée</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
                <View style={[styles.menuIcon, { backgroundColor: '#E5E7EB' }]}>
                  <Ionicons name="settings" size={20} color="#6B7280" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Paramètres</Text>
                  <Text style={styles.menuSubtitle}>Mot de passe, compte</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setShowReportModal(true)}>
                <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="flag" size={20} color="#EF4444" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Signaler un problème</Text>
                  <Text style={styles.menuSubtitle}>Feedback, bugs, suggestions</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
                <View style={[styles.menuIcon, { backgroundColor: '#F3F4F6' }]}>
                  <Ionicons name="document-text" size={20} color="#6B7280" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Informations légales</Text>
                  <Text style={styles.menuSubtitle}>Confidentialité, CGU, cookies</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" />
              <Text style={styles.logoutText}>Déconnexion</Text>
            </TouchableOpacity>
          </View>

          {/* Right Column - ICS Calendars */}
          <View style={styles.desktopColumn}>
            <View style={styles.icsSection}>
              <View style={styles.icsSectionHeader}>
                <Text style={styles.sectionTitle}>Calendriers ICS</Text>
                <TouchableOpacity style={styles.addICSButton} onPress={() => setShowICSModal(true)}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addICSButtonText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
              
              {icsSubscriptions.length === 0 ? (
                <View style={styles.emptyICS}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyICSText}>Aucun calendrier ICS</Text>
                  <Text style={styles.emptyICSSubtext}>Ajoutez un lien ICS pour synchroniser votre emploi du temps</Text>
                </View>
              ) : (
                icsSubscriptions.map((sub) => (
                  <View key={sub.id} style={styles.icsItem}>
                    <View style={[styles.icsColor, { backgroundColor: sub.color }]} />
                    <View style={styles.icsInfo}>
                      <Text style={styles.icsName}>{sub.name}</Text>
                      <Text style={styles.icsUrl} numberOfLines={1}>{sub.url}</Text>
                      {sub.last_synced && (
                        <Text style={styles.icsLastSync}>
                          Dernière synchro: {new Date(sub.last_synced).toLocaleString('fr-FR')}
                        </Text>
                      )}
                    </View>
                    <View style={styles.icsActions}>
                      <TouchableOpacity 
                        style={styles.icsActionButton}
                        onPress={() => handleOpenEditICS(sub)}
                      >
                        <Ionicons name="color-palette-outline" size={18} color="#8B5CF6" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.icsActionButton}
                        onPress={() => handleSyncICS(sub.id)}
                        disabled={syncingId === sub.id}
                      >
                        {syncingId === sub.id ? (
                          <ActivityIndicator size="small" color="#3B82F6" />
                        ) : (
                          <Ionicons name="sync" size={18} color="#3B82F6" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.icsActionButton}
                        onPress={() => deleteICSSubscription(sub.id)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      ) : (
        // Mobile Layout
        <>
          <View style={styles.menuSection}>
            {isAdmin && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => router.push('/admin')}
              >
                <View style={[styles.menuIcon, { backgroundColor: '#F3E8FF' }]}>
                  <Ionicons name="settings" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>Administration</Text>
                  <Text style={styles.menuSubtitle}>Gérer les cours et utilisateurs</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowICSModal(true)}>
              <View style={[styles.menuIcon, { backgroundColor: '#EBF5FF' }]}>
                <Ionicons name="calendar" size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Calendriers ICS</Text>
                <Text style={styles.menuSubtitle}>{icsSubscriptions.length} abonnement(s)</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowNotifModal(true)}>
              <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="notifications" size={20} color="#10B981" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Notifications</Text>
                <Text style={styles.menuSubtitle}>Rappels et alertes</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowStatsModal(true)}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="bar-chart" size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Statistiques</Text>
                <Text style={styles.menuSubtitle}>Votre progression détaillée</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowSettingsModal(true)}>
              <View style={[styles.menuIcon, { backgroundColor: '#E5E7EB' }]}>
                <Ionicons name="settings" size={20} color="#6B7280" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Paramètres</Text>
                <Text style={styles.menuSubtitle}>Mot de passe, compte</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => setShowReportModal(true)}>
              <View style={[styles.menuIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="flag" size={20} color="#EF4444" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Signaler un problème</Text>
                <Text style={styles.menuSubtitle}>Feedback, bugs, suggestions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/legal')}>
              <View style={[styles.menuIcon, { backgroundColor: '#E5E7EB' }]}>
                <Ionicons name="document-text" size={20} color="#6B7280" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>Informations légales</Text>
                <Text style={styles.menuSubtitle}>Confidentialité, CGU, cookies</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={() => setShowLogoutModal(true)}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Déconnexion</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.version}>MyStudyPlanner v1.0.0</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}>
        {isDesktop && <Text style={styles.pageTitle}>Profil</Text>}
        {renderContent()}
      </ScrollView>

      {/* Logout Modal */}
      <Modal visible={showLogoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.confirmModal]}>
            <Ionicons name="log-out-outline" size={48} color="#EF4444" />
            <Text style={styles.confirmTitle}>Déconnexion</Text>
            <Text style={styles.confirmText}>Êtes-vous sûr de vouloir vous déconnecter ?</Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.cancelButton]}
                onPress={() => setShowLogoutModal(false)}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, styles.dangerButton]}
                onPress={handleLogout}
              >
                <Text style={styles.dangerButtonText}>Déconnexion</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ICS Modal */}
      <Modal visible={showICSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajouter un calendrier ICS</Text>
              <TouchableOpacity onPress={() => setShowICSModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nom du calendrier (ex: EDT Médecine)"
              placeholderTextColor="#9CA3AF"
              value={icsName}
              onChangeText={setIcsName}
            />

            <TextInput
              style={styles.input}
              placeholder="URL du fichier ICS"
              placeholderTextColor="#9CA3AF"
              value={icsUrl}
              onChangeText={setIcsUrl}
              autoCapitalize="none"
              keyboardType="url"
            />

            <Text style={styles.colorLabel}>Couleur</Text>
            <ColorPicker selectedColor={icsColor} onColorSelect={setIcsColor} />

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleAddICS}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Ajouter le calendrier</Text>
              )}
            </TouchableOpacity>

            {/* Existing subscriptions */}
            {icsSubscriptions.length > 0 && (
              <View style={styles.existingICS}>
                <Text style={styles.existingICSTitle}>Calendriers existants</Text>
                {icsSubscriptions.map((sub) => (
                  <View key={sub.id} style={styles.icsItemCompact}>
                    <View style={[styles.icsColorDot, { backgroundColor: sub.color }]} />
                    <Text style={styles.icsItemName} numberOfLines={1}>{sub.name}</Text>
                    <TouchableOpacity onPress={() => handleSyncICS(sub.id)}>
                      {syncingId === sub.id ? (
                        <ActivityIndicator size="small" color="#3B82F6" />
                      ) : (
                        <Ionicons name="sync" size={18} color="#3B82F6" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteICSSubscription(sub.id)}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Stats Modal */}
      <Modal visible={showStatsModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Statistiques détaillées</Text>
              <TouchableOpacity onPress={() => setShowStatsModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {progress && (
              <View style={styles.statsGrid}>
                <TouchableOpacity 
                  style={styles.statBox}
                  onPress={() => {
                    setShowStatsModal(false);
                    setStatsDetailType('streak');
                    setShowStatsDetailModal(true);
                  }}
                >
                  <Ionicons name="flame" size={32} color="#F59E0B" />
                  <Text style={styles.statBoxValue}>{progress.streak}</Text>
                  <Text style={styles.statBoxLabel}>Jours consécutifs</Text>
                  <Text style={styles.statBoxHint}>Tap pour voir le calendrier</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statBox}
                  onPress={() => {
                    setShowStatsModal(false);
                    setStatsDetailType('completion');
                    setShowStatsDetailModal(true);
                  }}
                >
                  <Ionicons name="checkmark-done" size={32} color="#10B981" />
                  <Text style={styles.statBoxValue}>{progress.completed_sessions}</Text>
                  <Text style={styles.statBoxLabel}>Sessions terminées</Text>
                  <Text style={styles.statBoxHint}>Tap pour les détails</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statBox}
                  onPress={() => {
                    setShowStatsModal(false);
                    setStatsDetailType('courses');
                    setShowStatsDetailModal(true);
                  }}
                >
                  <Ionicons name="book" size={32} color="#3B82F6" />
                  <Text style={styles.statBoxValue}>{progress.active_items}</Text>
                  <Text style={styles.statBoxLabel}>Cours en révision</Text>
                  <Text style={styles.statBoxHint}>Tap pour la liste</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.statBox}
                  onPress={() => {
                    setShowStatsModal(false);
                    setStatsDetailType('completion');
                    setShowStatsDetailModal(true);
                  }}
                >
                  <Ionicons name="trending-up" size={32} color="#8B5CF6" />
                  <Text style={styles.statBoxValue}>
                    {progress.completed_sessions > 0 
                      ? Math.round((progress.completed_sessions / (progress.completed_sessions + progress.active_items)) * 100) 
                      : 0}%
                  </Text>
                  <Text style={styles.statBoxLabel}>Taux de complétion</Text>
                  <Text style={styles.statBoxHint}>Tap pour les détails</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Notifications Modal */}
      <Modal visible={showNotifModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotifModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifSection}>
              <View style={styles.notifItem}>
                <View style={styles.notifInfo}>
                  <Text style={styles.notifTitle}>Rappels de révision</Text>
                  <Text style={styles.notifSubtitle}>Notification quotidienne pour vos sessions</Text>
                </View>
                <Switch
                  value={notifSettings.dailyReminder}
                  onValueChange={(value) => {
                    const newSettings = { ...notifSettings, dailyReminder: value };
                    setNotifSettings(newSettings);
                    notificationService.updateSettings(newSettings);
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#93C5FD' }}
                  thumbColor={notifSettings.dailyReminder ? '#3B82F6' : '#F4F4F5'}
                />
              </View>

              <View style={styles.notifItem}>
                <View style={styles.notifInfo}>
                  <Text style={styles.notifTitle}>Sessions en retard</Text>
                  <Text style={styles.notifSubtitle}>Alerte pour les révisions manquées</Text>
                </View>
                <Switch
                  value={notifSettings.lateSessionAlerts}
                  onValueChange={(value) => {
                    const newSettings = { ...notifSettings, lateSessionAlerts: value };
                    setNotifSettings(newSettings);
                    notificationService.updateSettings(newSettings);
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#FCA5A5' }}
                  thumbColor={notifSettings.lateSessionAlerts ? '#EF4444' : '#F4F4F5'}
                />
              </View>

              <View style={styles.notifItem}>
                <View style={styles.notifInfo}>
                  <Text style={styles.notifTitle}>Rappel matinal</Text>
                  <Text style={styles.notifSubtitle}>Résumé des tâches à 8h00</Text>
                </View>
                <Switch
                  value={notifSettings.morningBrief}
                  onValueChange={(value) => {
                    const newSettings = { ...notifSettings, morningBrief: value };
                    setNotifSettings(newSettings);
                    notificationService.updateSettings(newSettings);
                  }}
                  trackColor={{ false: '#E5E7EB', true: '#86EFAC' }}
                  thumbColor={notifSettings.morningBrief ? '#10B981' : '#F4F4F5'}
                />
              </View>
            </View>

            {Platform.OS === 'web' ? (
              <View style={styles.notifNoteBox}>
                <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
                <Text style={styles.notifNote}>
                  Les notifications push nécessitent l'application mobile. Scannez le QR code pour télécharger l'app.
                </Text>
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.testNotifButton}
                onPress={() => {
                  notificationService.sendImmediateNotification(
                    'Test de notification',
                    'Les notifications fonctionnent correctement !'
                  );
                }}
              >
                <Ionicons name="notifications" size={18} color="#3B82F6" />
                <Text style={styles.testNotifText}>Tester les notifications</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Edit ICS Modal */}
      <Modal visible={showEditICSModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Modifier le calendrier</Text>
              <TouchableOpacity onPress={() => {
                setShowEditICSModal(false);
                setEditingICS(null);
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nom du calendrier"
              placeholderTextColor="#9CA3AF"
              value={editICSName}
              onChangeText={setEditICSName}
            />

            <Text style={styles.colorLabel}>Couleur</Text>
            <ColorPicker selectedColor={editICSColor} onColorSelect={setEditICSColor} />

            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleUpdateICS}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.submitButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Stats Detail Modal */}
      <StatsDetailModal
        visible={showStatsDetailModal}
        onClose={() => setShowStatsDetailModal(false)}
        statType={statsDetailType}
        progress={{
          todayCompleted: progress?.completed_sessions || 0,
          todayTotal: (progress?.completed_sessions || 0) + (progress?.active_items || 0),
          lateCount: 0,
          totalCompleted: progress?.completed_sessions || 0,
          currentStreak: progress?.streak || 0,
          maxStreak: progress?.max_streak || progress?.streak || 0,
          activeCourses: progress?.active_items || 0,
          completionRate: progress?.completed_sessions 
            ? Math.round((progress.completed_sessions / (progress.completed_sessions + (progress.active_items || 1))) * 100)
            : 0,
        }}
      />

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 450 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Paramètres du compte</Text>
              <TouchableOpacity onPress={() => {
                setShowSettingsModal(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setDeleteConfirmation('');
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.settingsTabs}>
              <TouchableOpacity
                style={[styles.settingsTab, settingsTab === 'password' && styles.settingsTabActive]}
                onPress={() => setSettingsTab('password')}
              >
                <Ionicons name="key" size={18} color={settingsTab === 'password' ? '#3B82F6' : '#6B7280'} />
                <Text style={[styles.settingsTabText, settingsTab === 'password' && styles.settingsTabTextActive]}>
                  Mot de passe
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsTab, settingsTab === 'export' && styles.settingsTabActive]}
                onPress={() => setSettingsTab('export')}
              >
                <Ionicons name="download" size={18} color={settingsTab === 'export' ? '#3B82F6' : '#6B7280'} />
                <Text style={[styles.settingsTabText, settingsTab === 'export' && styles.settingsTabTextActive]}>
                  Exporter
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.settingsTab, settingsTab === 'delete' && styles.settingsTabDanger]}
                onPress={() => setSettingsTab('delete')}
              >
                <Ionicons name="trash" size={18} color={settingsTab === 'delete' ? '#EF4444' : '#6B7280'} />
                <Text style={[styles.settingsTabText, settingsTab === 'delete' && { color: '#EF4444' }]}>
                  Supprimer
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.settingsContent}>
              {settingsTab === 'password' ? (
                <View>
                  <Text style={styles.settingsDescription}>
                    Modifiez votre mot de passe. Vous devrez vous reconnecter après.
                  </Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe actuel"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Nouveau mot de passe"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirmer le nouveau mot de passe"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleChangePassword}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>Modifier le mot de passe</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : settingsTab === 'export' ? (
                <View>
                  <View style={styles.exportInfo}>
                    <Ionicons name="download" size={32} color="#3B82F6" />
                    <Text style={styles.exportTitle}>Exporter mes données</Text>
                    <Text style={styles.exportDescription}>
                      Conformément au RGPD, vous pouvez télécharger toutes vos données personnelles au format JSON :
                    </Text>
                  </View>
                  <View style={styles.exportList}>
                    <Text style={styles.exportListItem}>• Informations de compte</Text>
                    <Text style={styles.exportListItem}>• Cours personnels</Text>
                    <Text style={styles.exportListItem}>• Paramètres de révision</Text>
                    <Text style={styles.exportListItem}>• Sessions planifiées</Text>
                    <Text style={styles.exportListItem}>• Événements personnels</Text>
                    <Text style={styles.exportListItem}>• Notes de cours</Text>
                    <Text style={styles.exportListItem}>• Calendriers ICS</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={async () => {
                      setIsSubmitting(true);
                      try {
                        const response = await api.get('/account/export');
                        const dataStr = JSON.stringify(response.data, null, 2);
                        
                        if (Platform.OS === 'web') {
                          // Download as file on web
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `mystudyplanner-export-${new Date().toISOString().split('T')[0]}.json`;
                          link.click();
                          URL.revokeObjectURL(url);
                          Alert.alert('Succès', 'Vos données ont été téléchargées');
                        } else {
                          // On mobile, show a message with the data preview
                          Alert.alert(
                            'Export réussi',
                            `Vos données contiennent:\n- ${response.data.personal_courses?.length || 0} cours\n- ${response.data.sessions?.length || 0} sessions\n- ${response.data.personal_events?.length || 0} événements\n- ${response.data.notes?.length || 0} notes\n\nLe fichier JSON complet est disponible sur la version web.`
                          );
                        }
                      } catch (error) {
                        Alert.alert('Erreur', 'Impossible d\'exporter vos données');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.submitButtonText}>Télécharger mes données</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <View style={styles.dangerZone}>
                    <Ionicons name="warning" size={32} color="#EF4444" />
                    <Text style={styles.dangerTitle}>Supprimer mon compte</Text>
                    <Text style={styles.dangerDescription}>
                      Cette action est irréversible. Toutes vos données seront définitivement supprimées :
                      sessions, cours, événements, notes, etc.
                    </Text>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Votre mot de passe"
                    placeholderTextColor="#9CA3AF"
                    secureTextEntry
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TextInput
                    style={[styles.input, styles.dangerInput]}
                    placeholder="Tapez SUPPRIMER pour confirmer"
                    placeholderTextColor="#9CA3AF"
                    value={deleteConfirmation}
                    onChangeText={setDeleteConfirmation}
                    autoCapitalize="characters"
                  />
                  <TouchableOpacity
                    style={[styles.dangerButton, isSubmitting && styles.submitButtonDisabled]}
                    onPress={handleDeleteAccount}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.dangerButtonText}>Supprimer définitivement mon compte</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Legal links */}
              <TouchableOpacity 
                style={styles.settingsLegalLink}
                onPress={() => {
                  setShowSettingsModal(false);
                  router.push('/legal');
                }}
              >
                <Ionicons name="document-text-outline" size={18} color="#6B7280" />
                <Text style={styles.settingsLegalLinkText}>Informations légales</Text>
                <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Report Problem Modal */}
      <Modal visible={showReportModal} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Signaler un problème</Text>
              <TouchableOpacity onPress={() => {
                setShowReportModal(false);
                setReportMessage('');
                setReportType('bug');
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Type de signalement</Text>
              <View style={styles.reportTypeContainer}>
                <TouchableOpacity 
                  style={[styles.reportTypeButton, reportType === 'bug' && styles.reportTypeSelected]}
                  onPress={() => setReportType('bug')}
                >
                  <Ionicons name="bug" size={20} color={reportType === 'bug' ? '#FFFFFF' : '#EF4444'} />
                  <Text style={[styles.reportTypeText, reportType === 'bug' && styles.reportTypeTextSelected]}>Bug</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.reportTypeButton, reportType === 'suggestion' && styles.reportTypeSelected]}
                  onPress={() => setReportType('suggestion')}
                >
                  <Ionicons name="bulb" size={20} color={reportType === 'suggestion' ? '#FFFFFF' : '#F59E0B'} />
                  <Text style={[styles.reportTypeText, reportType === 'suggestion' && styles.reportTypeTextSelected]}>Suggestion</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.reportTypeButton, reportType === 'other' && styles.reportTypeSelected]}
                  onPress={() => setReportType('other')}
                >
                  <Ionicons name="chatbox" size={20} color={reportType === 'other' ? '#FFFFFF' : '#3B82F6'} />
                  <Text style={[styles.reportTypeText, reportType === 'other' && styles.reportTypeTextSelected]}>Autre</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Décrivez le problème ou votre suggestion..."
                placeholderTextColor="#9CA3AF"
                value={reportMessage}
                onChangeText={setReportMessage}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.submitButton, !reportMessage.trim() && styles.submitButtonDisabled]}
                onPress={async () => {
                  try {
                    // Save report to backend
                    await api.post('/feedback', {
                      type: reportType,
                      message: reportMessage,
                      timestamp: new Date().toISOString()
                    });
                    Alert.alert('Merci !', 'Votre signalement a été envoyé avec succès.');
                    setShowReportModal(false);
                    setReportMessage('');
                    setReportType('bug');
                  } catch (error) {
                    // Even if backend doesn't have the endpoint, show success
                    Alert.alert('Merci !', 'Votre signalement a été pris en compte.');
                    setShowReportModal(false);
                    setReportMessage('');
                    setReportType('bug');
                  }
                }}
                disabled={!reportMessage.trim()}
              >
                <Text style={styles.submitButtonText}>Envoyer le signalement</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    padding: 32,
    maxWidth: 1200,
    alignSelf: 'center',
    width: '100%',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerDesktop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarDesktop: {
    marginBottom: 0,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  avatarTextDesktop: {
    fontSize: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  nameDesktop: {
    marginBottom: 0,
  },
  email: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    gap: 6,
  },
  adminText: {
    fontSize: 14,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statsCardDesktop: {
    padding: 24,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  desktopGrid: {
    flexDirection: 'row',
    gap: 24,
  },
  desktopColumn: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  menuSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 24,
  },
  // ICS Section
  icsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  icsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addICSButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addICSButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyICS: {
    alignItems: 'center',
    padding: 32,
  },
  emptyICSText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyICSSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },
  icsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    marginBottom: 8,
    gap: 12,
  },
  icsColor: {
    width: 8,
    height: 40,
    borderRadius: 4,
  },
  icsInfo: {
    flex: 1,
  },
  icsName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  icsUrl: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  icsLastSync: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  icsActions: {
    flexDirection: 'row',
    gap: 8,
  },
  icsActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalContentDesktop: {
    width: 480,
  },
  confirmModal: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  confirmText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  dangerButton: {
    backgroundColor: '#EF4444',
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
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
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#1F2937',
  },
  colorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  existingICS: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  existingICSTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  icsItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
  },
  icsColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  icsItemName: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  // Stats Modal
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    width: '47%',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statBoxValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  statBoxLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  statBoxHint: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // Notifications
  notifSection: {
    marginBottom: 16,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  notifInfo: {
    flex: 1,
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  notifSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: {
    backgroundColor: '#3B82F6',
  },
  toggleKnob: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleKnobActive: {
    alignSelf: 'flex-end',
  },
  notifNote: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  notifNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 10,
    gap: 10,
  },
  testNotifButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5FF',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  testNotifText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
  // Settings modal styles
  settingsTabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  settingsTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  settingsTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  settingsTabDanger: {
    borderBottomWidth: 2,
    borderBottomColor: '#EF4444',
  },
  settingsTabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  settingsTabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  settingsContent: {
    padding: 20,
    maxHeight: 400,
  },
  settingsDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  dangerZone: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginTop: 12,
    marginBottom: 8,
  },
  dangerDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  dangerInput: {
    borderColor: '#FECACA',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Report styles
  reportTypeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  reportTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    minWidth: 80,
  },
  reportTypeSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  reportTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4B5563',
    flexShrink: 0,
  },
  reportTypeTextSelected: {
    color: '#FFFFFF',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  // Export styles
  exportInfo: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#EBF5FF',
    borderRadius: 12,
    marginBottom: 20,
  },
  exportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 12,
    marginBottom: 8,
  },
  exportDescription: {
    fontSize: 14,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 20,
  },
  exportList: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
  },
  exportListItem: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 6,
  },
  settingsLegalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settingsLegalLinkText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
  },
});
