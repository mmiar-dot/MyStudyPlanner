import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface UpdateInfo {
  version: string;
  notes?: string;
  date?: string;
}

export const UpdateChecker: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { colors, isDark } = useTheme();

  useEffect(() => {
    // Only check for updates on desktop (Tauri)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).__TAURI__) {
      checkForUpdates();
    }
  }, []);

  const checkForUpdates = async () => {
    try {
      const { check } = await import('@tauri-apps/plugin-updater');
      const update = await check();
      
      if (update) {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: update.version,
          notes: update.body || undefined,
          date: update.date || undefined,
        });
        setShowModal(true);
      }
    } catch (error) {
      console.log('Update check not available:', error);
    }
  };

  const handleUpdate = async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && (window as any).__TAURI__) {
      try {
        setIsUpdating(true);
        const { check } = await import('@tauri-apps/plugin-updater');
        const { relaunch } = await import('@tauri-apps/plugin-process');
        
        const update = await check();
        if (update) {
          await update.downloadAndInstall();
          await relaunch();
        }
      } catch (error) {
        console.error('Update failed:', error);
        setIsUpdating(false);
      }
    }
  };

  const handleLater = () => {
    setShowModal(false);
  };

  if (!updateAvailable || !showModal) {
    return null;
  }

  return (
    <Modal visible={showModal} animationType="fade" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          <View style={styles.iconContainer}>
            <Ionicons name="cloud-download" size={48} color="#3B82F6" />
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            Mise à jour disponible
          </Text>

          <Text style={[styles.version, { color: colors.textSecondary }]}>
            Version {updateInfo?.version}
          </Text>

          {updateInfo?.notes && (
            <View style={[styles.notesContainer, { backgroundColor: colors.surfaceVariant }]}>
              <Text style={[styles.notesTitle, { color: colors.text }]}>
                Nouveautés :
              </Text>
              <Text style={[styles.notesText, { color: colors.textSecondary }]}>
                {updateInfo.notes}
              </Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.laterButton, { borderColor: colors.border }]}
              onPress={handleLater}
              disabled={isUpdating}
            >
              <Text style={[styles.laterButtonText, { color: colors.text }]}>
                Plus tard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.updateButton, isUpdating && styles.updateButtonDisabled]}
              onPress={handleUpdate}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="download" size={18} color="#FFFFFF" />
                  <Text style={styles.updateButtonText}>Mettre à jour</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {isUpdating && (
            <Text style={[styles.updatingText, { color: colors.textSecondary }]}>
              Téléchargement en cours...
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

// For TestFlight/App Store - just show a banner
export const AppStoreUpdateBanner: React.FC<{
  latestVersion?: string;
  currentVersion?: string;
}> = ({ latestVersion, currentVersion }) => {
  const { colors } = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (!latestVersion || !currentVersion || latestVersion === currentVersion || dismissed) {
    return null;
  }

  const openAppStore = () => {
    // Replace with your actual App Store URL
    const appStoreUrl = Platform.OS === 'ios' 
      ? 'https://apps.apple.com/app/mystudyplanner/id000000000'
      : 'https://play.google.com/store/apps/details?id=com.mystudyplanner';
    Linking.openURL(appStoreUrl);
  };

  return (
    <View style={[styles.banner, { backgroundColor: '#3B82F6' }]}>
      <Ionicons name="information-circle" size={20} color="#FFFFFF" />
      <Text style={styles.bannerText}>
        Nouvelle version {latestVersion} disponible
      </Text>
      <TouchableOpacity onPress={openAppStore}>
        <Text style={styles.bannerLink}>Mettre à jour</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)}>
        <Ionicons name="close" size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    marginBottom: 16,
  },
  notesContainer: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesText: {
    fontSize: 13,
    lineHeight: 20,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  updateButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateButtonDisabled: {
    opacity: 0.7,
  },
  updateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  updatingText: {
    marginTop: 12,
    fontSize: 13,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    paddingHorizontal: 16,
  },
  bannerText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
  },
  bannerLink: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
