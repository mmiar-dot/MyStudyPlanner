import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [isValidToken, setIsValidToken] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { resetPassword, accentColor } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    if (!token) {
      setIsVerifying(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/verify-reset-token/${token}`);
      if (response.ok) {
        setIsValidToken(true);
      }
    } catch (e) {
      console.error('Token verification failed:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!password || !confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await resetPassword(token || '', password);
      setSuccess(true);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={accentColor} />
        <Text style={styles.loadingText}>Vérification du lien...</Text>
      </View>
    );
  }

  if (!token || !isValidToken) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.errorIcon}>
          <Ionicons name="alert-circle" size={48} color="#EF4444" />
        </View>
        <Text style={styles.errorTitle}>Lien invalide</Text>
        <Text style={styles.errorDescription}>
          Ce lien de réinitialisation est invalide ou a expiré.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={() => router.replace('/(auth)/forgot-password')}
        >
          <Text style={styles.buttonText}>Demander un nouveau lien</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (success) {
    return (
      <View style={styles.centerContainer}>
        <View style={[styles.successIcon, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="checkmark-circle" size={48} color="#10B981" />
        </View>
        <Text style={styles.successTitle}>Mot de passe modifié !</Text>
        <Text style={styles.successDescription}>
          Votre mot de passe a été réinitialisé avec succès.
        </Text>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: accentColor }]}
          onPress={() => router.replace('/(auth)/login')}
        >
          <Text style={styles.buttonText}>Se connecter</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: accentColor + '20' }]}>
            <Ionicons name="lock-closed" size={32} color={accentColor} />
          </View>
          <Text style={styles.title}>Nouveau mot de passe</Text>
          <Text style={styles.subtitle}>
            Choisissez un nouveau mot de passe sécurisé.
          </Text>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View>
            <Text style={styles.label}>Nouveau mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text style={styles.label}>Confirmer le mot de passe</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#9CA3AF"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: accentColor }, isSubmitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.buttonText}>Réinitialiser le mot de passe</Text>
            )}
          </TouchableOpacity>
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
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9FAFB',
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
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 16,
  },
  errorIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  errorDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
  successDescription: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
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
});
