import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StudySession } from '../types';

interface SessionCardProps {
  session: StudySession;
  onComplete: () => void;
  onPress: () => void;
}

const getMethodLabel = (method: string): string => {
  switch (method) {
    case 'j_method':
      return 'Méthode J';
    case 'srs':
      return 'SRS';
    case 'tours':
      return 'Tours';
    default:
      return method;
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
      return '#10B981';
    case 'late':
      return '#EF4444';
    case 'pending':
      return '#3B82F6';
    default:
      return '#6B7280';
  }
};

export const SessionCard: React.FC<SessionCardProps> = ({ session, onComplete, onPress }) => {
  const statusColor = getStatusColor(session.status);
  const isCompleted = session.status === 'completed';

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {session.item_title}
        </Text>
        <View style={styles.metaRow}>
          <View style={styles.methodBadge}>
            <Text style={styles.methodText}>{getMethodLabel(session.method)}</Text>
          </View>
          {session.j_day !== undefined && session.j_day !== null && (
            <Text style={styles.jDay}>J{session.j_day}</Text>
          )}
          {session.tour_number && (
            <Text style={styles.jDay}>Tour {session.tour_number}</Text>
          )}
          {session.status === 'late' && (
            <View style={styles.lateBadge}>
              <Ionicons name="warning" size={12} color="#EF4444" />
              <Text style={styles.lateText}>En retard</Text>
            </View>
          )}
        </View>
      </View>
      {!isCompleted && (
        <TouchableOpacity
          style={styles.completeButton}
          onPress={(e) => {
            e.stopPropagation();
            onComplete();
          }}
        >
          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        </TouchableOpacity>
      )}
      {isCompleted && (
        <View style={styles.completedIcon}>
          <Ionicons name="checkmark-circle" size={32} color="#10B981" />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statusIndicator: {
    width: 4,
    height: 48,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  methodBadge: {
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  methodText: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '500',
  },
  jDay: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  lateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lateText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  completeButton: {
    padding: 4,
  },
  completedIcon: {
    opacity: 0.5,
  },
});
