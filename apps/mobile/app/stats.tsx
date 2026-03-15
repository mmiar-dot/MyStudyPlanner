import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { useAnalyticsStore } from '../src/store/analyticsStore';
import { useTheme } from '../src/contexts/ThemeContext';
import { format, subDays, startOfWeek, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function StatsScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 768;
  const chartWidth = isDesktop ? 600 : screenWidth - 48;
  const { colors, isDark, accentColor } = useTheme();
  
  const { progress, calendarData, fetchProgress, fetchCalendarData } = useAnalyticsStore();
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week');
  
  useEffect(() => {
    fetchProgress();
    const today = new Date();
    fetchCalendarData(today.getMonth() + 1, today.getFullYear());
  }, []);
  
  // Generate last 7 days data for chart
  const weeklyData = useMemo(() => {
    const labels: string[] = [];
    const completed: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStr = format(date, 'yyyy-MM-dd');
      labels.push(format(date, 'EEE', { locale: fr }));
      
      const dayData = calendarData[dateStr];
      completed.push(dayData?.completed || 0);
    }
    
    return { labels, datasets: [{ data: completed }] };
  }, [calendarData]);
  
  // Completion rate pie data
  const pieData = useMemo(() => {
    if (!progress) return [];
    const completed = progress.completed_sessions;
    const late = progress.late_sessions;
    const pending = progress.total_sessions - completed - late;
    
    return [
      { name: 'Terminées', population: completed, color: '#10B981', legendFontColor: colors.text },
      { name: 'En retard', population: late, color: '#EF4444', legendFontColor: colors.text },
      { name: 'À faire', population: Math.max(0, pending), color: '#3B82F6', legendFontColor: colors.text },
    ].filter(d => d.population > 0);
  }, [progress, colors.text]);
  
  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => accentColor,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: { borderRadius: 16 },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: accentColor,
    },
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.surfaceVariant }]} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Statistiques détaillées</Text>
        <View style={{ width: 40 }} />
      </View>
      
      <ScrollView style={styles.content} contentContainerStyle={isDesktop && styles.contentDesktop}>
        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={32} color="#10B981" />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{progress?.completed_sessions || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Terminées</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="warning" size={32} color="#EF4444" />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{progress?.late_sessions || 0}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>En retard</Text>
          </View>
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="trending-up" size={32} color={accentColor} />
            <Text style={[styles.summaryValue, { color: colors.text }]}>{progress?.completion_rate || 0}%</Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Taux</Text>
          </View>
        </View>
        
        {/* Weekly Progress Chart */}
        <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
          <Text style={[styles.chartTitle, { color: colors.text }]}>Sessions cette semaine</Text>
          {weeklyData.datasets[0].data.some(d => d > 0) ? (
            <BarChart
              data={weeklyData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              style={styles.chart}
              fromZero
              showValuesOnTopOfBars
            />
          ) : (
            <View style={styles.noDataContainer}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.noDataText, { color: colors.textSecondary }]}>Aucune donnée cette semaine</Text>
            </View>
          )}
        </View>
        
        {/* Completion Pie Chart */}
        {pieData.length > 0 && (
          <View style={[styles.chartCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Répartition des sessions</Text>
            <PieChart
              data={pieData}
              width={chartWidth}
              height={220}
              chartConfig={chartConfig}
              accessor="population"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
          </View>
        )}
        
        {/* Streak & Activity */}
        <View style={[styles.activityCard, { backgroundColor: accentColor }]}>
          <View style={styles.activityRow}>
            <View style={styles.activityItem}>
              <Ionicons name="flame" size={40} color="#FFFFFF" />
              <Text style={styles.activityValue}>{progress?.streak || 0}</Text>
              <Text style={styles.activityLabel}>Jours consécutifs</Text>
            </View>
            <View style={[styles.activityDivider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />
            <View style={styles.activityItem}>
              <Ionicons name="library" size={40} color="#FFFFFF" />
              <Text style={styles.activityValue}>{progress?.active_items || 0}</Text>
              <Text style={styles.activityLabel}>Cours actifs</Text>
            </View>
          </View>
        </View>
        
        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.surfaceVariant }]}>
          <Ionicons name="bulb" size={24} color="#FBBF24" />
          <View style={styles.tipsContent}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>Conseil du jour</Text>
            <Text style={[styles.tipsText, { color: colors.textSecondary }]}>
              {progress?.streak && progress.streak > 0
                ? `Bravo ! Vous êtes sur une série de ${progress.streak} jours. Continuez ainsi !`
                : "Commencez une série en révisant chaque jour. La régularité est la clé du succès !"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  contentDesktop: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  summaryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryValue: { fontSize: 28, fontWeight: '700', marginTop: 8 },
  summaryLabel: { fontSize: 12, marginTop: 4 },
  chartCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  chart: { borderRadius: 16, marginLeft: -16 },
  noDataContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noDataText: { fontSize: 14, marginTop: 12 },
  activityCard: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
  },
  activityRow: { flexDirection: 'row', alignItems: 'center' },
  activityItem: { flex: 1, alignItems: 'center' },
  activityDivider: { width: 1, height: 60, marginHorizontal: 16 },
  activityValue: { fontSize: 32, fontWeight: '700', color: '#FFFFFF', marginTop: 8 },
  activityLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  tipsCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 20,
  },
  tipsContent: { flex: 1 },
  tipsTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  tipsText: { fontSize: 13, lineHeight: 20 },
});
