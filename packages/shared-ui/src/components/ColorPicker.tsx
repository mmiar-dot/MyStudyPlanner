import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';

const COLORS = [
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#64748B', // Slate
];

interface ColorPickerProps {
  selectedColor: string;
  onColorSelect: (color: string) => void;
  compact?: boolean;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onColorSelect,
  compact = false,
}) => {
  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {COLORS.map((color) => (
        <TouchableOpacity
          key={color}
          style={[
            styles.colorButton,
            compact && styles.colorButtonCompact,
            { backgroundColor: color },
            selectedColor === color && styles.colorButtonSelected,
          ]}
          onPress={() => onColorSelect(color)}
        >
          {selectedColor === color && (
            <View style={styles.checkmark}>
              <Text style={styles.checkmarkText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    padding: 4,
  },
  containerCompact: {
    gap: 8,
  },
  colorButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorButtonCompact: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  colorButtonSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  checkmark: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1F2937',
  },
});

export { COLORS };
