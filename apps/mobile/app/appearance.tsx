import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../src/store/authStore';
import { useTheme } from '../src/contexts/ThemeContext';

const ACCENT_COLORS = [
  { name: 'Bleu', value: '#3B82F6' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Rose', value: '#EC4899' },
  { name: 'Rouge', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Jaune', value: '#EAB308' },
  { name: 'Vert', value: '#10B981' },
  { name: 'Turquoise', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Indigo', value: '#6366F1' },
];

export default function AppearanceScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const { theme, setTheme, accentColor, setAccentColor } = useAuthStore();
  const { isDark, colors } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, isDesktop && styles.headerDesktop, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surfaceVariant }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Apparence</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop
        ]}
      >
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Thème</Text>
          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={[styles.themeOption, theme === 'light' && { backgroundColor: colors.primaryLight }]}
              onPress={() => setTheme('light')}
            >
              <View style={[styles.themeIcon, { backgroundColor: '#F9FAFB' }]}>
                <Ionicons name="sunny" size={24} color="#F59E0B" />
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeLabel, { color: colors.text }]}>Clair</Text>
                <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>Thème lumineux par défaut</Text>
              </View>
              {theme === 'light' && (
                <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.themeOption, theme === 'dark' && { backgroundColor: colors.primaryLight }]}
              onPress={() => setTheme('dark')}
            >
              <View style={[styles.themeIcon, { backgroundColor: '#1F2937' }]}>
                <Ionicons name="moon" size={24} color="#818CF8" />
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeLabel, { color: colors.text }]}>Sombre</Text>
                <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>Réduit la fatigue oculaire</Text>
              </View>
              {theme === 'dark' && (
                <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              )}
            </TouchableOpacity>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <TouchableOpacity
              style={[styles.themeOption, theme === 'system' && { backgroundColor: colors.primaryLight }]}
              onPress={() => setTheme('system')}
            >
              <View style={[styles.themeIcon, { backgroundColor: '#E5E7EB' }]}>
                <Ionicons name="phone-portrait" size={24} color="#6B7280" />
              </View>
              <View style={styles.themeInfo}>
                <Text style={[styles.themeLabel, { color: colors.text }]}>Système</Text>
                <Text style={[styles.themeDescription, { color: colors.textSecondary }]}>Suit le thème de l'appareil</Text>
              </View>
              {theme === 'system' && (
                <Ionicons name="checkmark-circle" size={24} color={accentColor} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Accent Color Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Couleur d'accent</Text>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Personnalisez la couleur principale de l'application
          </Text>
          <View style={styles.colorsGrid}>
            {ACCENT_COLORS.map((color) => (
              <TouchableOpacity
                key={color.value}
                style={[
                  styles.colorButton,
                  { backgroundColor: color.value },
                  accentColor === color.value && styles.colorButtonSelected
                ]}
                onPress={() => setAccentColor(color.value)}
              >
                {accentColor === color.value && (
                  <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Preview Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Aperçu</Text>
          <View style={[styles.previewCard, { backgroundColor: colors.surface }]}>
            <View style={[styles.previewHeader, { backgroundColor: accentColor }]}>
              <Text style={styles.previewHeaderText}>Ma session</Text>
            </View>
            <View style={styles.previewBody}>
              <View style={styles.previewRow}>
                <View style={[styles.previewDot, { backgroundColor: accentColor }]} />
                <Text style={[styles.previewText, { color: colors.text }]}>Cardiologie - J1</Text>
              </View>
              <View style={styles.previewRow}>
                <View style={[styles.previewDot, { backgroundColor: '#10B981' }]} />
                <Text style={[styles.previewText, { color: colors.text }]}>Neurologie - Terminé</Text>
              </View>
              <TouchableOpacity style={[styles.previewButton, { backgroundColor: accentColor }]}>
                <Text style={styles.previewButtonText}>Terminer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerDesktop: {
    paddingHorizontal: 32,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scrollContentDesktop: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
    padding: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  themeOptionSelected: {
    backgroundColor: '#F9FAFB',
  },
  themeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeInfo: {
    flex: 1,
  },
  themeLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  themeDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  previewHeader: {
    padding: 16,
  },
  previewHeaderText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  previewBody: {
    padding: 16,
    gap: 12,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
  },
  previewButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  previewButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
