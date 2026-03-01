import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const { login, error, clearError } = useAuthStore();

  const handleLogin = async () => {
    setLocalError('');
    if (!email.trim() || !password.trim()) {
      setLocalError('Veuillez remplir tous les champs');
      return;
    }

    try {
      setIsSubmitting(true);
      clearError();
      await login(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      // Error is handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop && styles.scrollContentDesktop
          ]}
          keyboardShouldPersistTaps="handled"
        >
          {isDesktop ? (
            // Desktop layout with side panel
            <View style={styles.desktopContainer}>
              {/* Left Panel - Branding */}
              <View style={styles.brandingPanel}>
                <View style={styles.brandingContent}>
                  <View style={styles.logoLarge}>
                    <Ionicons name="book" size={64} color="#FFFFFF" />
                  </View>
                  <Text style={styles.brandTitle}>MyStudyPlanner</Text>
                  <Text style={styles.brandSubtitle}>
                    Votre meilleur compagnon pour vos révisions
                  </Text>
                  <View style={styles.features}>
                    <View style={styles.featureItem}>
                      <Ionicons name="calendar" size={20} color="#93C5FD" />
                      <Text style={styles.featureText}>Planification automatique</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="refresh" size={20} color="#93C5FD" />
                      <Text style={styles.featureText}>Méthode des J, SRS, Tours</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="sync" size={20} color="#93C5FD" />
                      <Text style={styles.featureText}>Synchronisation ICS</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right Panel - Form */}
              <View style={styles.formPanel}>
                <View style={styles.formContainer}>
                  <Text style={styles.welcomeTitle}>Bon retour !</Text>
                  <Text style={styles.welcomeSubtitle}>Connectez-vous pour continuer vos révisions</Text>

                  {displayError && (
                    <View style={styles.errorContainer}>
                      <Ionicons name="alert-circle" size={20} color="#EF4444" />
                      <Text style={styles.errorText}>{displayError}</Text>
                    </View>
                  )}

                  <View style={styles.inputContainer}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Email"
                      placeholderTextColor="#9CA3AF"
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoComplete="email"
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mot de passe"
                      placeholderTextColor="#9CA3AF"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoComplete="password"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color="#9CA3AF"
                      />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
                    onPress={handleLogin}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <ActivityIndicator color="#FFFFFF" />
                    ) : (
                      <Text style={styles.loginButtonText}>Se connecter</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.divider}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>ou</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity style={styles.googleButton}>
                    <Ionicons name="logo-google" size={20} color="#1F2937" />
                    <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                  </TouchableOpacity>

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Pas encore de compte ? </Text>
                    <Link href="/(auth)/register" asChild>
                      <TouchableOpacity>
                        <Text style={styles.footerLink}>S'inscrire</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </View>
              </View>
            </View>
          ) : (
            // Mobile layout
            <>
              <View style={styles.header}>
                <View style={styles.logo}>
                  <Ionicons name="book" size={40} color="#3B82F6" />
                </View>
                <Text style={styles.title}>MyStudyPlanner</Text>
                <Text style={styles.subtitle}>Calendrier de révision intelligent</Text>
              </View>

              <View style={styles.form}>
                {displayError && (
                  <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={20} color="#EF4444" />
                    <Text style={styles.errorText}>{displayError}</Text>
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor="#9CA3AF"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Mot de passe"
                    placeholderTextColor="#9CA3AF"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color="#9CA3AF"
                    />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.loginButton, isSubmitting && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.loginButtonText}>Se connecter</Text>
                  )}
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity style={styles.googleButton}>
                  <Ionicons name="logo-google" size={20} color="#1F2937" />
                  <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Pas encore de compte ? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>S'inscrire</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
  },
  scrollContentDesktop: {
    padding: 0,
  },
  // Desktop styles
  desktopContainer: {
    flexDirection: 'row',
    flex: 1,
    minHeight: '100%',
  },
  brandingPanel: {
    flex: 1,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  brandingContent: {
    maxWidth: 400,
    alignItems: 'center',
  },
  logoLarge: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  brandTitle: {
    fontSize: 40,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  brandSubtitle: {
    fontSize: 18,
    color: '#BFDBFE',
    textAlign: 'center',
    marginBottom: 48,
    lineHeight: 28,
  },
  features: {
    width: '100%',
    gap: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#DBEAFE',
  },
  formPanel: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    backgroundColor: '#FFFFFF',
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  // Common styles
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#EBF5FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
  },
  form: {
    marginBottom: 24,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#EF4444',
    flex: 1,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: '#1F2937',
  },
  loginButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#9CA3AF',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  googleButtonText: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6B7280',
  },
  footerLink: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
