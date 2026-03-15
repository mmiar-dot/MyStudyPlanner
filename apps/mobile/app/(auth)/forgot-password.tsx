import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function ForgotPasswordScreen() {
  const { accentColor } = useAuthStore();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="key" size={48} color={accentColor} />
          </View>
          
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          
          <Text style={styles.description}>
            Pour réinitialiser votre mot de passe, veuillez contacter l'administrateur de l'application.
          </Text>

          <View style={[styles.infoCard, { borderColor: accentColor }]}>
            <Ionicons name="information-circle" size={24} color={accentColor} />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Comment ça marche ?</Text>
              <Text style={styles.infoText}>
                1. Contactez l'administrateur{'\n'}
                2. Il générera un mot de passe temporaire{'\n'}
                3. Vous pourrez ensuite le modifier dans votre profil
              </Text>
            </View>
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.contactLabel}>Administrateur :</Text>
            <Text style={[styles.contactEmail, { color: accentColor }]}>admin@mystudyplanner.com</Text>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
            <Text style={styles.buttonText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  content: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    gap: 12,
    marginBottom: 24,
    width: '100%',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  contactSection: {
    alignItems: 'center',
    marginBottom: 32,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
  },
  contactLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
