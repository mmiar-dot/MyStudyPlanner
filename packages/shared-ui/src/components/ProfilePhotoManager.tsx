import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@mystudyplanner/api-client';

interface Avatar {
  id: string;
  name: string;
  url: string;
}

interface ProfilePhotoManagerProps {
  currentPhoto?: string | null;
  photoType?: string | null;
  userName: string;
  onPhotoUpdated: () => void;
}

export const ProfilePhotoManager: React.FC<ProfilePhotoManagerProps> = ({
  currentPhoto,
  photoType,
  userName,
  onPhotoUpdated,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'upload' | 'avatars'>('upload');

  useEffect(() => {
    loadAvatars();
  }, []);

  const loadAvatars = async () => {
    try {
      const response = await api.get<Avatar[]>('/profile/avatars');
      setAvatars(response.data);
    } catch (error) {
      console.error('Error loading avatars:', error);
    }
  };

  const handleUploadPhoto = async (useCamera: boolean) => {
    try {
      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'L\'accès à la caméra est nécessaire');
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission requise', 'L\'accès à la galerie est nécessaire');
          return;
        }
      }

      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
            base64: true,
          });

      if (!result.canceled && result.assets[0].base64) {
        setIsLoading(true);
        await api.put('/profile/photo', {
          photo_base64: `data:image/jpeg;base64,${result.assets[0].base64}`,
          photo_type: 'custom',
        });
        onPhotoUpdated();
        setShowModal(false);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de mettre à jour la photo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAvatar = async (avatar: Avatar) => {
    try {
      setIsLoading(true);
      await api.put(`/profile/avatar/${avatar.id}`);
      onPhotoUpdated();
      setShowModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de définir l\'avatar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePhoto = async () => {
    try {
      setIsLoading(true);
      await api.delete('/profile/photo');
      onPhotoUpdated();
      setShowModal(false);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de supprimer la photo');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitial = () => userName.charAt(0).toUpperCase();

  const renderProfileImage = () => {
    if (currentPhoto) {
      return (
        <Image
          source={{ uri: currentPhoto }}
          style={styles.profileImage}
        />
      );
    }
    return (
      <View style={styles.profileImagePlaceholder}>
        <Text style={styles.profileInitial}>{getInitial()}</Text>
      </View>
    );
  };

  return (
    <>
      <TouchableOpacity style={styles.profilePhotoContainer} onPress={() => setShowModal(true)}>
        {renderProfileImage()}
        <View style={styles.editBadge}>
          <Ionicons name="camera" size={14} color="#FFF" />
        </View>
      </TouchableOpacity>

      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Photo de profil</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Tabs */}
            <View style={styles.tabs}>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'upload' && styles.tabActive]}
                onPress={() => setSelectedTab('upload')}
              >
                <Text style={[styles.tabText, selectedTab === 'upload' && styles.tabTextActive]}>
                  Importer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, selectedTab === 'avatars' && styles.tabActive]}
                onPress={() => setSelectedTab('avatars')}
              >
                <Text style={[styles.tabText, selectedTab === 'avatars' && styles.tabTextActive]}>
                  Avatars
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
              </View>
            ) : selectedTab === 'upload' ? (
              <View style={styles.uploadOptions}>
                <TouchableOpacity
                  style={styles.uploadOption}
                  onPress={() => handleUploadPhoto(false)}
                >
                  <View style={[styles.uploadIcon, { backgroundColor: '#3B82F6' }]}>
                    <Ionicons name="images" size={24} color="#FFF" />
                  </View>
                  <Text style={styles.uploadText}>Galerie</Text>
                </TouchableOpacity>

                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.uploadOption}
                    onPress={() => handleUploadPhoto(true)}
                  >
                    <View style={[styles.uploadIcon, { backgroundColor: '#10B981' }]}>
                      <Ionicons name="camera" size={24} color="#FFF" />
                    </View>
                    <Text style={styles.uploadText}>Caméra</Text>
                  </TouchableOpacity>
                )}

                {currentPhoto && (
                  <TouchableOpacity
                    style={styles.uploadOption}
                    onPress={handleDeletePhoto}
                  >
                    <View style={[styles.uploadIcon, { backgroundColor: '#EF4444' }]}>
                      <Ionicons name="trash" size={24} color="#FFF" />
                    </View>
                    <Text style={styles.uploadText}>Supprimer</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <ScrollView style={styles.avatarGrid} contentContainerStyle={styles.avatarGridContent}>
                {avatars.map((avatar) => (
                  <TouchableOpacity
                    key={avatar.id}
                    style={styles.avatarOption}
                    onPress={() => handleSelectAvatar(avatar)}
                  >
                    <Image source={{ uri: avatar.url }} style={styles.avatarImage} />
                    <Text style={styles.avatarName}>{avatar.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  profilePhotoContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E5E7EB',
  },
  profileImagePlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitial: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFF',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
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
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  uploadOptions: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  uploadOption: {
    alignItems: 'center',
    gap: 8,
  },
  uploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 13,
    color: '#4B5563',
  },
  avatarGrid: {
    maxHeight: 300,
  },
  avatarGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
    justifyContent: 'center',
  },
  avatarOption: {
    alignItems: 'center',
    gap: 4,
    width: 80,
  },
  avatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E5E7EB',
  },
  avatarName: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});
