import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { requestPasswordReset, accentColor } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await requestPasswordReset(email.trim());
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="mail" size={48} color={accentColor} />
          </View>
          <Text style={styles.successTitle}>Email envoyé !</Text>
          <Text style={styles.successText}>
            Si un compte existe avec l'adresse {email}, vous recevrez un email avec les instructions pour réinitialiser votre mot de passe.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.buttonText}>Retour à la connexion</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#374151" />
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="key" size={32} color={accentColor} />
          </View>
          <Text style={styles.title}>Mot de passe oublié ?</Text>
          <Text style={styles.subtitle}>
            Pas de souci ! Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <Text style={styles.label}>Adresse email</Text>
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="votre@email.com"
              placeholderTextColor="#9CA3AF"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Envoyer le lien</Text>
            )}
          </TouchableOpacity>

          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={[styles.linkText, { color: accentColor }]}>Retour à la connexion</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    color: '#DC2626',
    fontSize: 14,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#111827',
  },
  button: {
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 15,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  successText: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
});
