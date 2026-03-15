import { useMemo } from 'react';
import { StyleSheet, ViewStyle, TextStyle, ImageStyle } from 'react-native';
import { useTheme, ThemeColors } from '../contexts/ThemeContext';

type NamedStyles<T> = { [P in keyof T]: ViewStyle | TextStyle | ImageStyle };
type StyleCreator<T> = (colors: ThemeColors, isDark: boolean) => T;

/**
 * Hook to create themed styles that automatically update when theme changes.
 * 
 * @example
 * const styles = useThemedStyles((colors) => ({
 *   container: {
 *     backgroundColor: colors.background,
 *   },
 *   text: {
 *     color: colors.text,
 *   },
 * }));
 */
export function useThemedStyles<T extends NamedStyles<T> | NamedStyles<any>>(
  styleCreator: StyleCreator<T>
): T {
  const { colors, isDark } = useTheme();

  return useMemo(() => {
    return StyleSheet.create(styleCreator(colors, isDark)) as T;
  }, [colors, isDark]);
}

export default useThemedStyles;
