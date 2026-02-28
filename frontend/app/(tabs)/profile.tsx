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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import { useEventStore } from '../../src/store/eventStore';
import { ColorPicker } from '../../src/components/ColorPicker';
import { ProfilePhotoManager } from '../../src/components/ProfilePhotoManager';
import { StatsDetailModal } from '../../src/components/StatsDetailModal';
import notificationService, { NotificationSettings } from '../../src/services/notificationService';
import api from '../../src/api/client';

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
  const [statsDetailType, setStatsDetailType] = useState<'today' | 'late' | 'completion' | 'courses' | 'streak'>('today');
  
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
          <View style={styles.statItem}>
            <Ionicons name="flame" size={24} color="#F59E0B" />
            <Text style={styles.statValue}>{progress.streak}</Text>
            <Text style={styles.statLabel}>Jours de suite</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <Text style={styles.statValue}>{progress.completed_sessions}</Text>
            <Text style={styles.statLabel}>Sessions terminées</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="book" size={24} color="#3B82F6" />
            <Text style={styles.statValue}>{progress.active_items}</Text>
            <Text style={styles.statLabel}>Cours actifs</Text>
          </View>
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
});
