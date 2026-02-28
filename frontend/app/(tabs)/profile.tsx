import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useAnalyticsStore } from '../../src/store/analyticsStore';
import { useEffect } from 'react';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { progress, fetchProgress } = useAnalyticsStore();

  useEffect(() => {
    fetchProgress();
  }, []);

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const isAdmin = user?.role === 'admin';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user?.name || 'Utilisateur'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#8B5CF6" />
              <Text style={styles.adminText}>Administrateur</Text>
            </View>
          )}
        </View>

        {/* Stats */}
        {progress && (
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress.streak}</Text>
              <Text style={styles.statLabel}>Jours de suite</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress.completed_sessions}</Text>
              <Text style={styles.statLabel}>Sessions terminées</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{progress.active_items}</Text>
              <Text style={styles.statLabel}>Cours actifs</Text>
            </View>
          </View>
        )}

        {/* Menu */}
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

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#EBF5FF' }]}>
              <Ionicons name="calendar" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Calendriers ICS</Text>
              <Text style={styles.menuSubtitle}>Abonnements faculté</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="notifications" size={20} color="#10B981" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Rappels et alertes</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
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

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#EF4444" />
          <Text style={styles.logoutText}>Déconnexion</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>RevisionMed v1.0.0</Text>
      </ScrollView>
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
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
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
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
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
});
