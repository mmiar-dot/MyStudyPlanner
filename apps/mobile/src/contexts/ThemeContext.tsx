import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';

// Default colors
const lightColors = {
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
};

const darkColors = {
  background: '#111827',
  surface: '#1F2937',
  surfaceVariant: '#374151',
  text: '#F9FAFB',
  textSecondary: '#D1D5DB',
  textTertiary: '#9CA3AF',
  border: '#374151',
  error: '#F87171',
  success: '#34D399',
  warning: '#FBBF24',
};

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceVariant: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  primary: string;
  primaryLight: string;
}

interface ThemeContextValue {
  isDark: boolean;
  colors: ThemeColors;
  accentColor: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { theme, accentColor } = useAuthStore();
  const systemScheme = useColorScheme();

  const isDark = theme === 'system' 
    ? systemScheme === 'dark' 
    : theme === 'dark';

  const colors = useMemo(() => {
    const baseColors = isDark ? darkColors : lightColors;
    return {
      ...baseColors,
      primary: accentColor,
      primaryLight: accentColor + '20',
    };
  }, [isDark, accentColor]);

  const value = useMemo(() => ({
    isDark,
    colors,
    accentColor,
  }), [isDark, colors, accentColor]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return default values if not in provider
    return {
      isDark: false,
      colors: { ...lightColors, primary: '#3B82F6', primaryLight: '#3B82F620' },
      accentColor: '#3B82F6',
    };
  }
  return context;
};
