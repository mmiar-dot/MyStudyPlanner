import React, { useState, useEffect } from 'react';
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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/contexts/ThemeContext';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

// Required for web OAuth
WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { colors, isDark, accentColor } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const { login, appleAuth, googleAuth, error, clearError } = useAuthStore();

  // Google Auth configuration
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: '1018659425498-xxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    iosClientId: '1018659425498-xxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    androidClientId: '1018659425498-xxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    webClientId: '1018659425498-xxxxxxxxxxxxxxxx.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
  });

  // Handle Google Auth response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleGoogleToken(authentication.accessToken);
      }
    } else if (response?.type === 'error') {
      setLocalError('Erreur lors de la connexion Google');
    }
  }, [response]);

  useEffect(() => {
    // Check if Apple Auth is available (iOS only)
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setAppleAuthAvailable(isAvailable);
      }
    };
    checkAppleAuth();
  }, []);

  // Handle Google token - fetch user info and authenticate
  const handleGoogleToken = async (accessToken: string) => {
    try {
      setIsSubmitting(true);
      setLocalError('');
      
      // Fetch user info from Google
      const userInfoResponse = await fetch(
        'https://www.googleapis.com/userinfo/v2/me',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      const userInfo = await userInfoResponse.json();
      
      if (userInfo.email) {
        await googleAuth(accessToken, userInfo.email, userInfo.name || '');
        router.replace('/(tabs)');
      } else {
        setLocalError('Impossible de récupérer les informations du compte Google');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      setLocalError('Erreur lors de la connexion avec Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLocalError('');
      clearError();
      await promptAsync();
    } catch (error) {
      console.error('Google sign in error:', error);
      setLocalError('Erreur lors de la connexion Google');
    }
  };

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

  const handleAppleSignIn = async () => {
    try {
      setIsSubmitting(true);
      setLocalError('');
      
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        ],
      });
      
      // Get full name if available
      let fullName: string | undefined;
      if (credential.fullName) {
        const { givenName, familyName } = credential.fullName;
        if (givenName || familyName) {
          fullName = [givenName, familyName].filter(Boolean).join(' ');
        }
      }
      
      // Call our backend with Apple credentials
      await appleAuth(
        credential.identityToken || '',
        credential.user,
        credential.email || undefined,
        fullName
      );
      
      router.replace('/(tabs)');
    } catch (e: any) {
      if (e.code === 'ERR_REQUEST_CANCELED') {
        // User canceled - do nothing
      } else {
        setLocalError('Erreur lors de la connexion Apple');
        console.error('Apple Sign In Error:', e);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayError = localError || error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
              <View style={[styles.brandingPanel, { backgroundColor: accentColor }]}>
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
                      <Ionicons name="calendar" size={20} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.featureText}>Planification automatique</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="refresh" size={20} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.featureText}>Méthode des J, SRS, Tours</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Ionicons name="sync" size={20} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.featureText}>Synchronisation ICS</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Right Panel - Form */}
              <View style={[styles.formPanel, { backgroundColor: colors.surface }]}>
                <View style={styles.formContainer}>
                  <Text style={[styles.welcomeTitle, { color: colors.text }]}>Bon retour !</Text>
                  <Text style={[styles.welcomeSubtitle, { color: colors.textSecondary }]}>Connectez-vous pour continuer vos révisions</Text>

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

                  <TouchableOpacity 
                    style={[styles.googleButton, isSubmitting && styles.loginButtonDisabled]}
                    onPress={handleGoogleSignIn}
                    disabled={isSubmitting || !request}
                  >
                    <Ionicons name="logo-google" size={20} color="#1F2937" />
                    <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                  </TouchableOpacity>

                  {(appleAuthAvailable || Platform.OS === 'web') && (
                    <TouchableOpacity 
                      style={styles.appleButton}
                      onPress={handleAppleSignIn}
                      disabled={isSubmitting || Platform.OS === 'web'}
                    >
                      <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                      <Text style={styles.appleButtonText}>
                        {Platform.OS === 'web' ? 'Apple (iOS uniquement)' : 'Continuer avec Apple'}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.footer}>
                    <Text style={styles.footerText}>Pas encore de compte ? </Text>
                    <Link href="/(auth)/register" asChild>
                      <TouchableOpacity>
                        <Text style={styles.footerLink}>S'inscrire</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>

                  <TouchableOpacity 
                    style={styles.legalLink}
                    onPress={() => router.push('/legal')}
                  >
                    <Text style={styles.legalLinkText}>
                      Politique de confidentialité • CGU
                    </Text>
                  </TouchableOpacity>
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

                <Link href="/(auth)/forgot-password" asChild>
                  <TouchableOpacity style={styles.forgotPasswordButton}>
                    <Text style={styles.forgotPasswordText}>Mot de passe oublié ?</Text>
                  </TouchableOpacity>
                </Link>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>ou</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity 
                  style={[styles.googleButton, isSubmitting && styles.loginButtonDisabled]}
                  onPress={handleGoogleSignIn}
                  disabled={isSubmitting || !request}
                >
                  <Ionicons name="logo-google" size={20} color="#1F2937" />
                  <Text style={styles.googleButtonText}>Continuer avec Google</Text>
                </TouchableOpacity>

                {appleAuthAvailable && (
                  <TouchableOpacity 
                    style={styles.appleButton}
                    onPress={handleAppleSignIn}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
                    <Text style={styles.appleButtonText}>Continuer avec Apple</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Pas encore de compte ? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.footerLink}>S'inscrire</Text>
                  </TouchableOpacity>
                </Link>
              </View>

              <TouchableOpacity 
                style={styles.legalLink}
                onPress={() => router.push('/legal')}
              >
                <Text style={styles.legalLinkText}>
                  Politique de confidentialité • CGU
                </Text>
              </TouchableOpacity>
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
  forgotPasswordButton: {
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
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
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 12,
  },
  appleButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
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
  legalLink: {
    marginTop: 24,
    alignItems: 'center',
  },
  legalLinkText: {
    color: '#9CA3AF',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
});
