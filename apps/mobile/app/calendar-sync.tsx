import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';
import calendarSyncService, { DeviceCalendar, CalendarSyncConfig } from '../src/services/calendarSyncService';

export default function CalendarSyncScreen() {
  const { colors, isDark, accentColor } = useTheme();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [deviceCalendars, setDeviceCalendars] = useState<DeviceCalendar[]>([]);
  const [config, setConfig] = useState<CalendarSyncConfig>(calendarSyncService.getConfig());
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const available = await calendarSyncService.isAvailable();
      setIsAvailable(available);

      if (available) {
        const status = await calendarSyncService.getPermissionStatus();
        setPermissionStatus(status);

        if (status === 'granted') {
          const calendars = await calendarSyncService.getDeviceCalendars();
          setDeviceCalendars(calendars);
        }
      }

      setConfig(calendarSyncService.getConfig());
    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, []);

  const handleRequestPermission = async () => {
    const granted = await calendarSyncService.requestPermissions();
    if (granted) {
      setPermissionStatus('granted');
      const calendars = await calendarSyncService.getDeviceCalendars();
      setDeviceCalendars(calendars);
    } else {
      setPermissionStatus('denied');
      Alert.alert(
        'Permission refusée',
        'Pour synchroniser vos sessions avec votre calendrier, veuillez autoriser l\'accès dans les paramètres de votre appareil.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    await calendarSyncService.updateConfig({ enabled });
    setConfig({ ...config, enabled });
  };

  const handleToggleAutoSync = async (autoSync: boolean) => {
    await calendarSyncService.updateConfig({ autoSync });
    setConfig({ ...config, autoSync });
  };

  const handleSelectCalendar = async (calendarId: string) => {
    await calendarSyncService.updateConfig({ selectedCalendarId: calendarId });
    setConfig({ ...config, selectedCalendarId: calendarId });
  };

  const handleSyncDirection = async (direction: 'import' | 'export' | 'both') => {
    await calendarSyncService.updateConfig({ syncDirection: direction });
    setConfig({ ...config, syncDirection: direction });
  };

  const handleSyncNow = async () => {
    if (!config.selectedCalendarId && !config.enabled) {
      Alert.alert('Configuration requise', 'Veuillez d\'abord sélectionner un calendrier.');
      return;
    }

    setSyncing(true);
    try {
      const result = await calendarSyncService.syncPendingSessions();
      Alert.alert(
        'Synchronisation terminée',
        `${result.success} session(s) synchronisée(s)${result.failed > 0 ? `, ${result.failed} échec(s)` : ''}.`
      );
      setConfig(calendarSyncService.getConfig());
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de synchroniser les sessions.');
    } finally {
      setSyncing(false);
    }
  };

  const handleCreateAppCalendar = async () => {
    setSyncing(true);
    try {
      const calendarId = await calendarSyncService.getOrCreateAppCalendar();
      if (calendarId) {
        await handleSelectCalendar(calendarId);
        await loadData();
        Alert.alert('Succès', 'Calendrier MyStudyPlanner créé avec succès !');
      } else {
        Alert.alert('Erreur', 'Impossible de créer le calendrier.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le calendrier.');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={accentColor} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Sync Calendrier</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accentColor]} />
        }
      >
        {/* Web notice */}
        {Platform.OS === 'web' && (
          <View style={[styles.noticeCard, { backgroundColor: isDark ? '#422006' : '#FEF3C7' }]}>
            <Ionicons name="information-circle" size={24} color="#F59E0B" />
            <Text style={[styles.noticeText, { color: isDark ? '#FCD34D' : '#92400E' }]}>
              La synchronisation calendrier n'est disponible que sur mobile (iOS/Android).
              Testez sur Expo Go pour utiliser cette fonctionnalité.
            </Text>
          </View>
        )}

        {/* Not available notice */}
        {!isAvailable && Platform.OS !== 'web' && (
          <View style={[styles.noticeCard, { backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2' }]}>
            <Ionicons name="warning" size={24} color="#EF4444" />
            <Text style={[styles.noticeText, { color: isDark ? '#FCA5A5' : '#991B1B' }]}>
              L'API Calendrier n'est pas disponible sur cet appareil.
            </Text>
          </View>
        )}

        {/* Permission required */}
        {isAvailable && permissionStatus !== 'granted' && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={24} color={accentColor} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Autorisation requise</Text>
            </View>
            <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
              Pour synchroniser vos sessions d'étude avec votre calendrier, nous avons besoin de votre autorisation.
            </Text>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: accentColor }]}
              onPress={handleRequestPermission}
            >
              <Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Autoriser l'accès</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main settings (when permission granted) */}
        {isAvailable && permissionStatus === 'granted' && (
          <>
            {/* Enable sync toggle */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <Text style={[styles.settingTitle, { color: colors.text }]}>Synchronisation activée</Text>
                  <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                    Sync automatique des sessions
                  </Text>
                </View>
                <Switch
                  value={config.enabled}
                  onValueChange={handleToggleSync}
                  trackColor={{ false: colors.border, true: accentColor }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {config.enabled && (
                <View style={[styles.settingRow, { borderTopWidth: 1, borderTopColor: colors.border }]}>
                  <View style={styles.settingInfo}>
                    <Text style={[styles.settingTitle, { color: colors.text }]}>Sync automatique</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                      Synchroniser au lancement
                    </Text>
                  </View>
                  <Switch
                    value={config.autoSync}
                    onValueChange={handleToggleAutoSync}
                    trackColor={{ false: colors.border, true: accentColor }}
                    thumbColor="#FFFFFF"
                  />
                </View>
              )}
            </View>

            {/* Calendar selection */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="calendar" size={24} color={accentColor} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Calendrier cible</Text>
              </View>

              {/* Create app calendar button */}
              <TouchableOpacity
                style={[styles.createCalendarButton, { borderColor: accentColor }]}
                onPress={handleCreateAppCalendar}
                disabled={syncing}
              >
                <Ionicons name="add-circle" size={20} color={accentColor} />
                <Text style={[styles.createCalendarText, { color: accentColor }]}>
                  Créer un calendrier MyStudyPlanner
                </Text>
              </TouchableOpacity>

              <Text style={[styles.orText, { color: colors.textTertiary }]}>— ou sélectionner —</Text>

              {/* Calendar list */}
              {deviceCalendars.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Aucun calendrier trouvé sur votre appareil.
                </Text>
              ) : (
                deviceCalendars.map((calendar) => (
                  <TouchableOpacity
                    key={calendar.id}
                    style={[
                      styles.calendarItem,
                      { borderColor: colors.border },
                      config.selectedCalendarId === calendar.id && {
                        borderColor: accentColor,
                        backgroundColor: isDark ? `${accentColor}20` : `${accentColor}10`,
                      },
                    ]}
                    onPress={() => handleSelectCalendar(calendar.id)}
                  >
                    <View style={[styles.calendarColor, { backgroundColor: calendar.color }]} />
                    <View style={styles.calendarInfo}>
                      <Text style={[styles.calendarTitle, { color: colors.text }]}>{calendar.title}</Text>
                      <Text style={[styles.calendarSource, { color: colors.textSecondary }]}>
                        {calendar.source}
                      </Text>
                    </View>
                    {config.selectedCalendarId === calendar.id && (
                      <Ionicons name="checkmark-circle" size={24} color={accentColor} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </View>

            {/* Sync direction */}
            <View style={[styles.section, { backgroundColor: colors.surface }]}>
              <View style={styles.sectionHeader}>
                <Ionicons name="sync" size={24} color={accentColor} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Direction de sync</Text>
              </View>

              <View style={styles.directionOptions}>
                {[
                  { id: 'export', label: 'Exporter', icon: 'arrow-up', desc: 'Sessions → Calendrier' },
                  { id: 'import', label: 'Importer', icon: 'arrow-down', desc: 'Calendrier → Sessions' },
                  { id: 'both', label: 'Les deux', icon: 'swap-vertical', desc: 'Sync bidirectionnelle' },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.directionOption,
                      { borderColor: colors.border },
                      config.syncDirection === option.id && {
                        borderColor: accentColor,
                        backgroundColor: isDark ? `${accentColor}20` : `${accentColor}10`,
                      },
                    ]}
                    onPress={() => handleSyncDirection(option.id as any)}
                  >
                    <Ionicons
                      name={option.icon as any}
                      size={24}
                      color={config.syncDirection === option.id ? accentColor : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.directionLabel,
                        { color: config.syncDirection === option.id ? accentColor : colors.text },
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={[styles.directionDesc, { color: colors.textTertiary }]}>{option.desc}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Last sync info */}
            {config.lastSyncDate && (
              <View style={[styles.section, { backgroundColor: colors.surface }]}>
                <View style={styles.lastSyncRow}>
                  <Ionicons name="time" size={20} color={colors.textSecondary} />
                  <Text style={[styles.lastSyncText, { color: colors.textSecondary }]}>
                    Dernière sync : {new Date(config.lastSyncDate).toLocaleString('fr-FR')}
                  </Text>
                </View>
              </View>
            )}

            {/* Sync now button */}
            <TouchableOpacity
              style={[
                styles.syncButton,
                { backgroundColor: accentColor },
                syncing && { opacity: 0.7 },
              ]}
              onPress={handleSyncNow}
              disabled={syncing}
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="sync" size={24} color="#FFFFFF" />
              )}
              <Text style={styles.syncButtonText}>
                {syncing ? 'Synchronisation...' : 'Synchroniser maintenant'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Info card */}
        <View style={[styles.infoCard, { backgroundColor: isDark ? colors.surfaceVariant : '#F0F9FF' }]}>
          <Ionicons name="information-circle" size={24} color={accentColor} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Comment ça marche ?</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              • Les sessions seront ajoutées à votre calendrier avec un rappel 30 min avant{'\n'}
              • Utilisez "Exporter" pour envoyer vos sessions vers le calendrier{'\n'}
              • Le calendrier Google/iCloud sera automatiquement synchronisé
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    padding: 16,
    gap: 16,
  },
  noticeCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  createCalendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  createCalendarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 20,
  },
  calendarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 12,
  },
  calendarColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  calendarInfo: {
    flex: 1,
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: '500',
  },
  calendarSource: {
    fontSize: 12,
    marginTop: 2,
  },
  directionOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  directionOption: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  directionLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  directionDesc: {
    fontSize: 10,
    textAlign: 'center',
  },
  lastSyncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lastSyncText: {
    fontSize: 13,
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 12,
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
});
