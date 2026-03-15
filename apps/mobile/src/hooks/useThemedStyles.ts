import { StyleSheet } from 'react-native';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

// Hook to create themed styles
export function useThemedStyles<T extends StyleSheet.NamedStyles<T>>(
  styleFactory: (colors: ThemeColors, isDark: boolean) => T
): T {
  const { colors, isDark } = useTheme();
  return styleFactory(colors, isDark);
}

// Common themed styles that can be reused
export function useCommonStyles() {
  const { colors, isDark, accentColor } = useTheme();
  
  return StyleSheet.create({
    // Containers
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    surface: {
      backgroundColor: colors.surface,
    },
    surfaceVariant: {
      backgroundColor: colors.surfaceVariant,
    },
    
    // Cards
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      shadowColor: isDark ? '#000' : '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    
    // Text
    textPrimary: {
      color: colors.text,
    },
    textSecondary: {
      color: colors.textSecondary,
    },
    textTertiary: {
      color: colors.textTertiary,
    },
    
    // Headers
    header: {
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
    },
    
    // Inputs
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
    },
    input: {
      flex: 1,
      height: 48,
      fontSize: 16,
      color: colors.text,
    },
    inputIcon: {
      marginRight: 8,
      color: colors.textTertiary,
    },
    
    // Buttons
    primaryButton: {
      backgroundColor: accentColor,
      borderRadius: 12,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    primaryButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryButton: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 12,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    
    // Borders
    border: {
      borderColor: colors.border,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
    },
    
    // Status colors
    errorText: {
      color: colors.error,
    },
    successText: {
      color: colors.success,
    },
    warningText: {
      color: colors.warning,
    },
    
    // Error container
    errorContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2',
      padding: 12,
      borderRadius: 8,
      gap: 8,
    },
  });
}

// Helper to apply dark mode to any color
export function adjustColorForDarkMode(color: string, isDark: boolean): string {
  if (!isDark) return color;
  
  // Make light colors darker for dark mode backgrounds
  const lightColors: Record<string, string> = {
    '#F9FAFB': '#1F2937',
    '#F3F4F6': '#374151',
    '#E5E7EB': '#4B5563',
    '#FFFFFF': '#1F2937',
  };
  
  return lightColors[color] || color;
}
