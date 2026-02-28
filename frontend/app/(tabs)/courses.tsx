import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCatalogStore } from '../../src/store/catalogStore';
import { MethodSelector } from '../../src/components/MethodSelector';
import { CatalogItem, RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../../src/types';

export default function CoursesScreen() {
  const { items, allItems, userSettings, fetchItems, fetchAllItems, fetchUserSettings, setItemMethod, isLoading } = useCatalogStore();
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showMethodSelector, setShowMethodSelector] = useState(false);

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchAllItems(),
      fetchUserSettings(),
    ]);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleSelectMethod = (item: CatalogItem) => {
    setSelectedItem(item);
    setShowMethodSelector(true);
  };

  const handleMethodConfirm = async (
    method: RevisionMethod,
    jSettings?: JMethodSettings,
    srsSettings?: SRSSettings,
    toursSettings?: ToursSettings
  ) => {
    if (selectedItem) {
      await setItemMethod(selectedItem.id, method, jSettings, srsSettings, toursSettings);
    }
  };

  const getItemSettings = (itemId: string) => {
    return userSettings.find((s) => s.item_id === itemId);
  };

  const getMethodBadge = (method?: RevisionMethod) => {
    if (!method || method === 'none') return null;
    
    const config: Record<string, { label: string; color: string; bg: string }> = {
      j_method: { label: 'Méthode J', color: '#3B82F6', bg: '#EBF5FF' },
      srs: { label: 'SRS', color: '#8B5CF6', bg: '#F3E8FF' },
      tours: { label: 'Tours', color: '#10B981', bg: '#D1FAE5' },
    };
    
    const c = config[method];
    if (!c) return null;
    
    return (
      <View style={[styles.methodBadge, { backgroundColor: c.bg }]}>
        <Text style={[styles.methodBadgeText, { color: c.color }]}>{c.label}</Text>
      </View>
    );
  };

  // Group items by parent
  const chapters = allItems.filter((item) => item.level === 0);
  const coursesByChapter = allItems.reduce((acc, item) => {
    if (item.parent_id) {
      if (!acc[item.parent_id]) acc[item.parent_id] = [];
      acc[item.parent_id].push(item);
    }
    return acc;
  }, {} as Record<string, CatalogItem[]>);

  if (isLoading && allItems.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Cours</Text>
          <Text style={styles.subtitle}>
            {allItems.filter(i => i.level > 0).length} cours disponibles
          </Text>
        </View>

        {chapters.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="library-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>Aucun cours disponible</Text>
            <Text style={styles.emptyText}>
              Les cours seront ajoutés par l'administrateur
            </Text>
          </View>
        ) : (
          <View style={styles.chaptersList}>
            {chapters.map((chapter) => {
              const courses = coursesByChapter[chapter.id] || [];
              const isExpanded = expandedChapters.has(chapter.id);
              const configuredCount = courses.filter(
                (c) => getItemSettings(c.id)?.method && getItemSettings(c.id)?.method !== 'none'
              ).length;

              return (
                <View key={chapter.id} style={styles.chapterCard}>
                  <TouchableOpacity
                    style={styles.chapterHeader}
                    onPress={() => toggleChapter(chapter.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.chapterInfo}>
                      <Text style={styles.chapterTitle}>{chapter.title}</Text>
                      <Text style={styles.chapterCount}>
                        {configuredCount}/{courses.length} configurés
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color="#6B7280"
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.coursesList}>
                      {courses.map((course) => {
                        const settings = getItemSettings(course.id);
                        return (
                          <TouchableOpacity
                            key={course.id}
                            style={styles.courseItem}
                            onPress={() => handleSelectMethod(course)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.courseInfo}>
                              <Text style={styles.courseTitle}>{course.title}</Text>
                              {getMethodBadge(settings?.method)}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Method Selector Modal */}
      <MethodSelector
        visible={showMethodSelector}
        onClose={() => {
          setShowMethodSelector(false);
          setSelectedItem(null);
        }}
        onSelect={handleMethodConfirm}
        itemTitle={selectedItem?.title || ''}
        currentMethod={selectedItem ? getItemSettings(selectedItem.id)?.method : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },
  chaptersList: {
    gap: 16,
  },
  chapterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  chapterInfo: {
    flex: 1,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  chapterCount: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  coursesList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courseInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  courseTitle: {
    fontSize: 16,
    color: '#374151',
    flex: 1,
  },
  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  methodBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
