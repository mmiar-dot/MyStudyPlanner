import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCatalogStore } from '../../src/store/catalogStore';
import { MethodSelector } from '../../src/components/MethodSelector';
import { CatalogItem, RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '../../src/types';

export default function CoursesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  
  const { 
    allItems, 
    userSettings, 
    fetchAllItems, 
    fetchUserSettings, 
    setItemMethod, 
    createPersonalCourse,
    deletePersonalCourse,
    hideItem,
    isLoading 
  } = useCatalogStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseParent, setNewCourseParent] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPersonalOnly, setShowPersonalOnly] = useState(false);

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

  const handleAddPersonalCourse = async () => {
    if (!newCourseTitle.trim()) {
      Alert.alert('Erreur', 'Le titre est requis');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await createPersonalCourse(newCourseTitle.trim(), newCourseParent);
      setShowAddCourse(false);
      setNewCourseTitle('');
      setNewCourseParent(null);
      Alert.alert('Succès', 'Cours personnel créé');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteOrHide = (item: CatalogItem) => {
    if (item.is_personal) {
      Alert.alert(
        'Supprimer',
        `Voulez-vous supprimer "${item.title}" ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Supprimer',
            style: 'destructive',
            onPress: async () => {
              await deletePersonalCourse(item.id);
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Masquer',
        `Voulez-vous masquer "${item.title}" de votre liste ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Masquer',
            style: 'destructive',
            onPress: async () => {
              await hideItem(item.id);
            },
          },
        ]
      );
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

  // Filter and group items
  let filteredItems = allItems;
  if (showPersonalOnly) {
    filteredItems = allItems.filter(item => item.is_personal);
  }
  
  const chapters = filteredItems.filter((item) => item.level === 0);
  const coursesByChapter = filteredItems.reduce((acc, item) => {
    if (item.parent_id) {
      if (!acc[item.parent_id]) acc[item.parent_id] = [];
      acc[item.parent_id].push(item);
    }
    return acc;
  }, {} as Record<string, CatalogItem[]>);

  // Personal courses without parent (standalone)
  const standaloneCourses = filteredItems.filter(item => item.level === 1 && item.is_personal && !chapters.find(c => c.id === item.parent_id));

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
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3B82F6']} />
        }
      >
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View>
            <Text style={[styles.title, isDesktop && styles.titleDesktop]}>Cours</Text>
            <Text style={styles.subtitle}>
              {allItems.filter(i => i.level > 0).length} cours disponibles
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddCourse(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            {isDesktop && <Text style={styles.addButtonText}>Ajouter un cours</Text>}
          </TouchableOpacity>
        </View>

        {/* Filter Toggle */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterButton, !showPersonalOnly && styles.filterButtonActive]}
            onPress={() => setShowPersonalOnly(false)}
          >
            <Text style={[styles.filterText, !showPersonalOnly && styles.filterTextActive]}>
              Tous
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, showPersonalOnly && styles.filterButtonActive]}
            onPress={() => setShowPersonalOnly(true)}
          >
            <Ionicons 
              name="person" 
              size={16} 
              color={showPersonalOnly ? '#3B82F6' : '#6B7280'} 
            />
            <Text style={[styles.filterText, showPersonalOnly && styles.filterTextActive]}>
              Mes cours
            </Text>
          </TouchableOpacity>
        </View>

        {/* Desktop Layout: Two columns */}
        <View style={[styles.contentWrapper, isDesktop && styles.contentWrapperDesktop]}>
          {chapters.length === 0 && standaloneCourses.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="library-outline" size={48} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>
                {showPersonalOnly ? 'Aucun cours personnel' : 'Aucun cours disponible'}
              </Text>
              <Text style={styles.emptyText}>
                {showPersonalOnly 
                  ? 'Ajoutez vos propres cours avec le bouton +' 
                  : 'Les cours seront ajoutés par l\'administrateur'}
              </Text>
            </View>
          ) : (
            <View style={[styles.chaptersList, isDesktop && styles.chaptersListDesktop]}>
              {chapters.map((chapter) => {
                const courses = coursesByChapter[chapter.id] || [];
                const isExpanded = expandedChapters.has(chapter.id);
                const configuredCount = courses.filter(
                  (c) => getItemSettings(c.id)?.method && getItemSettings(c.id)?.method !== 'none'
                ).length;

                return (
                  <View key={chapter.id} style={[styles.chapterCard, isDesktop && styles.chapterCardDesktop]}>
                    <TouchableOpacity
                      style={styles.chapterHeader}
                      onPress={() => toggleChapter(chapter.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.chapterInfo}>
                        <View style={styles.chapterTitleRow}>
                          <Text style={styles.chapterTitle}>{chapter.title}</Text>
                          {chapter.is_personal && (
                            <View style={styles.personalBadge}>
                              <Ionicons name="person" size={12} color="#8B5CF6" />
                            </View>
                          )}
                        </View>
                        <Text style={styles.chapterCount}>
                          {configuredCount}/{courses.length} configurés
                        </Text>
                      </View>
                      <View style={styles.chapterActions}>
                        {chapter.is_personal && (
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDeleteOrHide(chapter);
                            }}
                            style={styles.actionButton}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        )}
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={24}
                          color="#6B7280"
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.coursesList}>
                        {courses.map((course) => {
                          const settings = getItemSettings(course.id);
                          return (
                            <View key={course.id} style={styles.courseItem}>
                              <TouchableOpacity
                                style={styles.courseContent}
                                onPress={() => handleSelectMethod(course)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.courseInfo}>
                                  <Text style={styles.courseTitle}>{course.title}</Text>
                                  <View style={styles.courseBadges}>
                                    {course.is_personal && (
                                      <View style={styles.personalBadgeSmall}>
                                        <Ionicons name="person" size={10} color="#8B5CF6" />
                                        <Text style={styles.personalBadgeText}>Personnel</Text>
                                      </View>
                                    )}
                                    {getMethodBadge(settings?.method)}
                                  </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleDeleteOrHide(course)}
                                style={styles.deleteButton}
                              >
                                <Ionicons 
                                  name={course.is_personal ? "trash-outline" : "eye-off-outline"} 
                                  size={18} 
                                  color={course.is_personal ? "#EF4444" : "#9CA3AF"} 
                                />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        {/* Add course to chapter button */}
                        <TouchableOpacity
                          style={styles.addToCourseButton}
                          onPress={() => {
                            setNewCourseParent(chapter.id);
                            setShowAddCourse(true);
                          }}
                        >
                          <Ionicons name="add" size={18} color="#3B82F6" />
                          <Text style={styles.addToCourseText}>Ajouter un cours ici</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Standalone personal courses */}
              {standaloneCourses.length > 0 && (
                <View style={[styles.chapterCard, isDesktop && styles.chapterCardDesktop]}>
                  <View style={styles.chapterHeader}>
                    <View style={styles.chapterInfo}>
                      <Text style={styles.chapterTitle}>Cours personnels</Text>
                      <Text style={styles.chapterCount}>Sans chapitre</Text>
                    </View>
                  </View>
                  <View style={styles.coursesList}>
                    {standaloneCourses.map((course) => {
                      const settings = getItemSettings(course.id);
                      return (
                        <View key={course.id} style={styles.courseItem}>
                          <TouchableOpacity
                            style={styles.courseContent}
                            onPress={() => handleSelectMethod(course)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.courseInfo}>
                              <Text style={styles.courseTitle}>{course.title}</Text>
                              {getMethodBadge(settings?.method)}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleDeleteOrHide(course)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add Course Modal */}
      <Modal visible={showAddCourse} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nouveau cours personnel</Text>
              <TouchableOpacity onPress={() => {
                setShowAddCourse(false);
                setNewCourseTitle('');
                setNewCourseParent(null);
              }}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {newCourseParent && (
              <View style={styles.parentInfo}>
                <Ionicons name="folder" size={16} color="#3B82F6" />
                <Text style={styles.parentInfoText}>
                  Dans : {allItems.find(i => i.id === newCourseParent)?.title || 'Chapitre'}
                </Text>
              </View>
            )}

            <TextInput
              style={styles.input}
              placeholder="Titre du cours"
              placeholderTextColor="#9CA3AF"
              value={newCourseTitle}
              onChangeText={setNewCourseTitle}
              autoFocus
            />

            {!newCourseParent && (
              <View style={styles.parentSelector}>
                <Text style={styles.parentSelectorLabel}>Chapitre (optionnel)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.parentOptions}>
                  {chapters.filter(c => !c.is_personal).map(chapter => (
                    <TouchableOpacity
                      key={chapter.id}
                      style={[
                        styles.parentOption,
                        newCourseParent === chapter.id && styles.parentOptionSelected
                      ]}
                      onPress={() => setNewCourseParent(chapter.id)}
                    >
                      <Text style={[
                        styles.parentOptionText,
                        newCourseParent === chapter.id && styles.parentOptionTextSelected
                      ]}>
                        {chapter.title}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity
              style={[styles.createButton, isSubmitting && styles.createButtonDisabled]}
              onPress={handleAddPersonalCourse}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Créer le cours</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  scrollContentDesktop: {
    paddingHorizontal: 40,
    paddingTop: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerDesktop: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1F2937',
  },
  titleDesktop: {
    fontSize: 32,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterButtonActive: {
    backgroundColor: '#EBF5FF',
    borderColor: '#3B82F6',
  },
  filterText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#3B82F6',
  },
  contentWrapper: {
    flex: 1,
  },
  contentWrapperDesktop: {
    maxWidth: 1200,
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
  chaptersListDesktop: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20,
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
  chapterCardDesktop: {
    flex: 1,
    minWidth: 350,
    maxWidth: 550,
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
  chapterTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  chapterActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 4,
  },
  personalBadge: {
    backgroundColor: '#F3E8FF',
    padding: 4,
    borderRadius: 6,
  },
  personalBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  personalBadgeText: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '500',
  },
  coursesList: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  courseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  courseInfo: {
    flex: 1,
    gap: 6,
  },
  courseBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseTitle: {
    fontSize: 16,
    color: '#374151',
  },
  deleteButton: {
    padding: 16,
    paddingLeft: 0,
  },
  addToCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  addToCourseText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  modalContentDesktop: {
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
    borderRadius: 24,
    marginBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  parentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#EBF5FF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  parentInfoText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  parentSelector: {
    marginBottom: 20,
  },
  parentSelectorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 10,
  },
  parentOptions: {
    flexDirection: 'row',
  },
  parentOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    marginRight: 8,
  },
  parentOptionSelected: {
    backgroundColor: '#EBF5FF',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  parentOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  parentOptionTextSelected: {
    color: '#3B82F6',
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
