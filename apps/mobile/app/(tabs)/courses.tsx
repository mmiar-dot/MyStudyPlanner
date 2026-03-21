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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCatalogStore, CustomSection } from '@mystudyplanner/api-client';
import { MethodSelector } from '@mystudyplanner/shared-ui';
import { ColorPicker } from '@mystudyplanner/shared-ui';
import { CatalogItem, RevisionMethod, JMethodSettings, SRSSettings, ToursSettings } from '@mystudyplanner/api-client';
import { api } from '@mystudyplanner/api-client';
import { useTheme } from '../../src/contexts/ThemeContext';

type FilterType = 'all' | 'personal' | string; // string for custom section IDs

export default function CoursesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { colors, isDark, accentColor } = useTheme();
  
  const { 
    allItems, 
    userSettings, 
    customSections,
    itemColors,
    itemSections,
    fetchAllItems, 
    fetchUserSettings, 
    fetchCustomSections,
    fetchItemColors,
    fetchItemSections,
    setItemMethod, 
    createPersonalCourse,
    deletePersonalCourse,
    renameCourse,
    hideItem,
    unhideItem,
    createSection,
    updateSection,
    deleteSection,
    setItemColor,
    isLoading 
  } = useCatalogStore();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showHiddenItems, setShowHiddenItems] = useState(false);
  const [hiddenItems, setHiddenItems] = useState<CatalogItem[]>([]);
  
  // Add course modal
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');
  const [newCourseParent, setNewCourseParent] = useState<string | null>(null);
  const [newCourseColor, setNewCourseColor] = useState('#3B82F6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add section modal
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('#8B5CF6');
  
  // Color picker modal
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [colorPickerItem, setColorPickerItem] = useState<CatalogItem | null>(null);
  const [tempColor, setTempColor] = useState('#3B82F6');
  
  // Rename modal
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameItem, setRenameItem] = useState<CatalogItem | CustomSection | null>(null);
  const [renameType, setRenameType] = useState<'course' | 'section'>('course');
  const [newName, setNewName] = useState('');
  
  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<CatalogItem | null>(null);
  const [deleteAction, setDeleteAction] = useState<'delete' | 'hide'>('delete');

  const loadData = useCallback(async () => {
    await Promise.all([
      fetchAllItems(),
      fetchUserSettings(),
      fetchCustomSections(),
      fetchItemColors(),
      fetchItemSections(),
    ]);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  // Load hidden items when toggle is enabled
  const loadHiddenItems = async () => {
    try {
      const response = await api.get('/user/hidden');
      setHiddenItems(response.data);
    } catch (error) {
      console.error('Error loading hidden items:', error);
    }
  };

  useEffect(() => {
    if (showHiddenItems) {
      loadHiddenItems();
    }
  }, [showHiddenItems]);

  const handleUnhideItem = async (itemId: string) => {
    try {
      await unhideItem(itemId);
      // Remove from local list
      setHiddenItems(prev => prev.filter(item => item.id !== itemId));
      // Refresh catalog
      await loadData();
      Alert.alert('Succès', 'Cours restauré');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de restaurer le cours');
    }
  };

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
      await createPersonalCourse(newCourseTitle.trim(), newCourseParent, undefined, newCourseColor);
      setShowAddCourse(false);
      setNewCourseTitle('');
      setNewCourseParent(null);
      setNewCourseColor('#3B82F6');
      Alert.alert('Succès', 'Cours créé');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer le cours');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }
    
    try {
      setIsSubmitting(true);
      await createSection(newSectionName.trim(), newSectionColor);
      setShowAddSection(false);
      setNewSectionName('');
      setNewSectionColor('#8B5CF6');
      Alert.alert('Succès', 'Section créée');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de créer la section');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = (item: CatalogItem) => {
    setDeleteItem(item);
    setDeleteAction(item.is_personal ? 'delete' : 'hide');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    
    try {
      if (deleteAction === 'delete' && deleteItem.is_personal) {
        await deletePersonalCourse(deleteItem.id);
        await loadData();
        if (Platform.OS !== 'web') {
          Alert.alert('Succès', 'Cours supprimé');
        }
      } else {
        await hideItem(deleteItem.id);
        await loadData();
      }
    } catch (error) {
      console.error('Delete/hide error:', error);
      if (Platform.OS !== 'web') {
        Alert.alert('Erreur', 'Impossible de supprimer/masquer le cours');
      }
    } finally {
      setShowDeleteModal(false);
      setDeleteItem(null);
    }
  };

  const handleOpenColorPicker = (item: CatalogItem) => {
    setColorPickerItem(item);
    setTempColor(getItemColor(item.id));
    setShowColorPicker(true);
  };

  const handleSaveColor = async () => {
    if (colorPickerItem) {
      await setItemColor(colorPickerItem.id, tempColor);
      setShowColorPicker(false);
      setColorPickerItem(null);
    }
  };

  const handleOpenRenameModal = (item: CatalogItem | CustomSection, type: 'course' | 'section') => {
    setRenameItem(item);
    setRenameType(type);
    setNewName('name' in item ? item.name : item.title);
    setShowRenameModal(true);
  };

  const handleRename = async () => {
    if (!newName.trim() || !renameItem) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }
    
    try {
      setIsSubmitting(true);
      if (renameType === 'course' && 'title' in renameItem) {
        // Only personal courses can be renamed
        if (!renameItem.is_personal) {
          Alert.alert('Erreur', 'Seuls les cours personnels peuvent être renommés');
          return;
        }
        await renameCourse(renameItem.id, newName.trim());
      } else if (renameType === 'section' && 'color' in renameItem) {
        await updateSection(renameItem.id, newName.trim(), renameItem.color);
      }
      setShowRenameModal(false);
      setRenameItem(null);
      setNewName('');
      Alert.alert('Succès', 'Nom modifié');
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de modifier le nom');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getItemSettings = (itemId: string) => {
    return userSettings.find((s) => s.item_id === itemId);
  };

  const getItemColor = (itemId: string) => {
    return itemColors[itemId] || '#3B82F6';
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
  if (activeFilter === 'personal') {
    filteredItems = allItems.filter(item => item.is_personal);
  } else if (activeFilter !== 'all') {
    // Custom section filter
    filteredItems = allItems.filter(item => itemSections[item.id] === activeFilter);
  }
  
  const chapters = filteredItems.filter((item) => item.level === 0);
  const coursesByChapter = filteredItems.reduce((acc, item) => {
    if (item.parent_id) {
      if (!acc[item.parent_id]) acc[item.parent_id] = [];
      acc[item.parent_id].push(item);
    }
    return acc;
  }, {} as Record<string, CatalogItem[]>);

  // Standalone courses (level 1 without parent in filtered list)
  const standaloneCourses = filteredItems.filter(item => 
    item.level === 1 && !chapters.find(c => c.id === item.parent_id)
  );

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[accentColor]} />
        }
      >
        {/* Header */}
        <View style={[styles.header, isDesktop && styles.headerDesktop]}>
          <View>
            <Text style={[styles.title, isDesktop && styles.titleDesktop, { color: colors.text }]}>Cours</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {allItems.filter(i => i.level > 0).length} cours disponibles
            </Text>
          </View>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: accentColor }]}
            onPress={() => setShowAddCourse(true)}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            {isDesktop && <Text style={styles.addButtonText}>Ajouter un cours</Text>}
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surfaceVariant }, activeFilter === 'all' && { backgroundColor: colors.primaryLight }]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[styles.filterText, { color: colors.textSecondary }, activeFilter === 'all' && { color: accentColor }]}>
                Tous
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surfaceVariant }, activeFilter === 'personal' && { backgroundColor: colors.primaryLight }]}
              onPress={() => setActiveFilter('personal')}
            >
              <Ionicons 
                name="person" 
                size={16} 
                color={activeFilter === 'personal' ? accentColor : colors.textSecondary} 
              />
              <Text style={[styles.filterText, { color: colors.textSecondary }, activeFilter === 'personal' && { color: accentColor }]}>
                Mes cours
              </Text>
            </TouchableOpacity>

            {/* Hidden Items Toggle */}
            <TouchableOpacity
              style={[styles.filterButton, { backgroundColor: colors.surfaceVariant }, showHiddenItems && { backgroundColor: isDark ? '#7F1D1D' : '#FEF2F2' }]}
              onPress={() => setShowHiddenItems(!showHiddenItems)}
            >
              <Ionicons 
                name={showHiddenItems ? "eye" : "eye-off"} 
                size={16} 
                color={showHiddenItems ? colors.error : colors.textSecondary} 
              />
              <Text style={[styles.filterText, { color: colors.textSecondary }, showHiddenItems && { color: colors.error }]}>
                Masqués
              </Text>
            </TouchableOpacity>

            {/* Custom Sections */}
            {customSections.map((section) => (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.filterButton, 
                  { backgroundColor: colors.surfaceVariant },
                  activeFilter === section.id && { backgroundColor: section.color + '20' },
                  { borderColor: activeFilter === section.id ? section.color : colors.border }
                ]}
                onPress={() => setActiveFilter(section.id)}
                onLongPress={() => {
                  Alert.alert('Section', `Que voulez-vous faire avec "${section.name}" ?`, [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Renommer', onPress: () => handleOpenRenameModal(section, 'section') },
                    { text: 'Supprimer', style: 'destructive', onPress: () => deleteSection(section.id) }
                  ]);
                }}
              >
                <View style={[styles.sectionDot, { backgroundColor: section.color }]} />
                <Text style={[styles.filterText, { color: colors.textSecondary }, activeFilter === section.id && { color: section.color }]}>
                  {section.name}
                </Text>
                {/* Desktop edit button */}
                {isDesktop && (
                  <TouchableOpacity
                    style={styles.sectionEditButton}
                    onPress={(e) => {
                      e.stopPropagation();
                      Alert.alert('Section', `Que voulez-vous faire avec "${section.name}" ?`, [
                        { text: 'Annuler', style: 'cancel' },
                        { text: 'Renommer', onPress: () => handleOpenRenameModal(section, 'section') },
                        { text: 'Supprimer', style: 'destructive', onPress: () => deleteSection(section.id) }
                      ]);
                    }}
                  >
                    <Ionicons name="ellipsis-vertical" size={14} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))}

            {/* Add Section Button */}
            <TouchableOpacity
              style={[styles.addSectionButton, { borderColor: colors.border, backgroundColor: colors.surfaceVariant }]}
              onPress={() => setShowAddSection(true)}
            >
              <Ionicons name="add" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content */}
        <View style={[styles.contentWrapper, isDesktop && styles.contentWrapperDesktop]}>
          {chapters.length === 0 && standaloneCourses.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface }]}>
              <Ionicons name="library-outline" size={48} color={colors.textTertiary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {activeFilter === 'personal' ? 'Aucun cours personnel' : 
                 activeFilter !== 'all' ? 'Aucun cours dans cette section' : 'Aucun cours disponible'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {activeFilter === 'personal' 
                  ? 'Ajoutez vos propres cours avec le bouton +' 
                  : 'Ajoutez des cours ou changez de filtre'}
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
                const chapterColor = getItemColor(chapter.id);

                return (
                  <View key={chapter.id} style={[styles.chapterCard, { backgroundColor: colors.surface, borderColor: colors.border }, isDesktop && styles.chapterCardDesktop]}>
                    <TouchableOpacity
                      style={styles.chapterHeader}
                      onPress={() => toggleChapter(chapter.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.chapterColorBar, { backgroundColor: chapterColor }]} />
                      <View style={styles.chapterInfo}>
                        <View style={styles.chapterTitleRow}>
                          <Text style={[styles.chapterTitle, { color: colors.text }]}>{chapter.title}</Text>
                          {chapter.is_personal && (
                            <View style={[styles.personalBadge, { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' }]}>
                              <Ionicons name="person" size={12} color="#8B5CF6" />
                            </View>
                          )}
                        </View>
                        <Text style={[styles.chapterCount, { color: colors.textSecondary }]}>
                          {configuredCount}/{courses.length} configurés
                        </Text>
                      </View>
                      <View style={styles.chapterActions}>
                        {/* Button to configure the whole chapter with Tours method */}
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            handleSelectMethod(chapter);
                          }}
                          style={[styles.actionButton, styles.planChapterButton]}
                        >
                          <Ionicons name="calendar" size={18} color={colors.success} />
                        </TouchableOpacity>
                        {chapter.is_personal && (
                          <TouchableOpacity 
                            onPress={(e) => {
                              e.stopPropagation();
                              handleOpenRenameModal(chapter, 'course');
                            }}
                            style={styles.actionButton}
                          >
                            <Ionicons name="pencil-outline" size={18} color={accentColor} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            handleOpenColorPicker(chapter);
                          }}
                          style={styles.actionButton}
                        >
                          <Ionicons name="color-palette-outline" size={18} color={colors.textSecondary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteItem(chapter);
                          }}
                          style={styles.actionButton}
                        >
                          <Ionicons 
                            name={chapter.is_personal ? "trash-outline" : "eye-off-outline"} 
                            size={18} 
                            color={chapter.is_personal ? colors.error : colors.textSecondary} 
                          />
                        </TouchableOpacity>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={24}
                          color={colors.textSecondary}
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.coursesList, { borderTopColor: colors.border }]}>
                        {courses.map((course) => {
                          const settings = getItemSettings(course.id);
                          const courseColor = getItemColor(course.id);
                          
                          return (
                            <View key={course.id} style={[styles.courseItem, { borderBottomColor: colors.border }]}>
                              <View style={[styles.courseColorDot, { backgroundColor: courseColor }]} />
                              <TouchableOpacity
                                style={styles.courseContent}
                                onPress={() => handleSelectMethod(course)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.courseInfo}>
                                  <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
                                  <View style={styles.courseBadges}>
                                    {course.is_personal && (
                                      <View style={[styles.personalBadgeSmall, { backgroundColor: isDark ? '#4C1D95' : '#F3E8FF' }]}>
                                        <Text style={styles.personalBadgeText}>Personnel</Text>
                                      </View>
                                    )}
                                    {getMethodBadge(settings?.method)}
                                  </View>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                              </TouchableOpacity>
                              <TouchableOpacity 
                                onPress={() => handleOpenColorPicker(course)}
                                style={styles.colorButton}
                              >
                                <Ionicons name="color-palette-outline" size={16} color={colors.textSecondary} />
                              </TouchableOpacity>
                              {course.is_personal && (
                                <TouchableOpacity 
                                  onPress={() => handleOpenRenameModal(course, 'course')}
                                  style={styles.editButton}
                                >
                                  <Ionicons name="pencil-outline" size={16} color={accentColor} />
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity 
                                onPress={() => handleDeleteItem(course)}
                                style={styles.deleteButton}
                              >
                                <Ionicons name="trash-outline" size={16} color={colors.error} />
                              </TouchableOpacity>
                            </View>
                          );
                        })}
                        
                        <TouchableOpacity
                          style={[styles.addToCourseButton, { borderColor: colors.border }]}
                          onPress={() => {
                            setNewCourseParent(chapter.id);
                            setShowAddCourse(true);
                          }}
                        >
                          <Ionicons name="add" size={18} color={accentColor} />
                          <Text style={[styles.addToCourseText, { color: accentColor }]}>Ajouter un cours ici</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Standalone courses */}
              {standaloneCourses.length > 0 && (
                <View style={[styles.chapterCard, { backgroundColor: colors.surface, borderColor: colors.border }, isDesktop && styles.chapterCardDesktop]}>
                  <View style={[styles.chapterHeader, { paddingVertical: 12 }]}>
                    <View style={[styles.chapterColorBar, { backgroundColor: colors.textTertiary }]} />
                    <View style={styles.chapterInfo}>
                      <Text style={[styles.chapterTitle, { color: colors.textSecondary }]}>Cours sans chapitre</Text>
                    </View>
                  </View>
                  <View style={styles.coursesList}>
                    {standaloneCourses.map((course) => {
                      const settings = getItemSettings(course.id);
                      const courseColor = getItemColor(course.id);
                      
                      return (
                        <View key={course.id} style={[styles.courseItem, { borderBottomColor: colors.border }]}>
                          <View style={[styles.courseColorDot, { backgroundColor: courseColor }]} />
                          <TouchableOpacity
                            style={styles.courseContent}
                            onPress={() => handleSelectMethod(course)}
                            activeOpacity={0.7}
                          >
                            <View style={styles.courseInfo}>
                              <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
                              {getMethodBadge(settings?.method)}
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleOpenColorPicker(course)}
                            style={styles.colorButton}
                          >
                            <Ionicons name="color-palette-outline" size={16} color={colors.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity 
                            onPress={() => handleDeleteItem(course)}
                            style={styles.deleteButton}
                          >
                            <Ionicons name="trash-outline" size={16} color={colors.error} />
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

        {/* Hidden Items Section */}
        {showHiddenItems && hiddenItems.length > 0 && (
          <View style={styles.hiddenSection}>
            <Text style={styles.hiddenSectionTitle}>
              <Ionicons name="eye-off" size={18} color="#6B7280" /> Cours masqués ({hiddenItems.length})
            </Text>
            {hiddenItems.map((item) => (
              <View key={item.id} style={styles.hiddenItem}>
                <View style={styles.hiddenItemInfo}>
                  <Ionicons 
                    name={item.level === 0 ? "folder" : "book"} 
                    size={18} 
                    color="#9CA3AF" 
                  />
                  <Text style={styles.hiddenItemTitle}>{item.title}</Text>
                </View>
                <TouchableOpacity
                  style={styles.unhideButton}
                  onPress={() => handleUnhideItem(item.id)}
                >
                  <Ionicons name="eye" size={18} color="#3B82F6" />
                  <Text style={styles.unhideButtonText}>Restaurer</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {showHiddenItems && hiddenItems.length === 0 && (
          <View style={[styles.emptyHiddenSection, { backgroundColor: colors.surface }]}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={[styles.emptyHiddenText, { color: colors.text }]}>Aucun cours masqué</Text>
          </View>
        )}
      </ScrollView>

      {/* Add Course Modal */}
      <Modal visible={showAddCourse} animationType="slide" transparent>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouveau cours</Text>
              <TouchableOpacity onPress={() => {
                setShowAddCourse(false);
                setNewCourseTitle('');
                setNewCourseParent(null);
                setNewCourseColor('#3B82F6');
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {newCourseParent && (
              <View style={[styles.parentInfo, { backgroundColor: colors.surfaceVariant }]}>
                <Ionicons name="folder" size={16} color={accentColor} />
                <Text style={[styles.parentInfoText, { color: colors.text }]}>
                  Dans : {allItems.find(i => i.id === newCourseParent)?.title || 'Chapitre'}
                </Text>
              </View>
            )}

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text }]}
              placeholder="Titre du cours"
              placeholderTextColor={colors.textTertiary}
              value={newCourseTitle}
              onChangeText={setNewCourseTitle}
              autoFocus
            />

            <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>Couleur</Text>
            <ColorPicker selectedColor={newCourseColor} onColorSelect={setNewCourseColor} />

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: accentColor }, isSubmitting && styles.createButtonDisabled]}
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Section Modal */}
      <Modal visible={showAddSection} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Nouvelle section</Text>
              <TouchableOpacity onPress={() => {
                setShowAddSection(false);
                setNewSectionName('');
                setNewSectionColor('#8B5CF6');
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text }]}
              placeholder="Nom de la section"
              placeholderTextColor={colors.textTertiary}
              value={newSectionName}
              onChangeText={setNewSectionName}
              autoFocus
            />

            <Text style={[styles.colorLabel, { color: colors.textSecondary }]}>Couleur</Text>
            <ColorPicker selectedColor={newSectionColor} onColorSelect={setNewSectionColor} />

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: accentColor }, isSubmitting && styles.createButtonDisabled]}
              onPress={handleAddSection}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Créer la section</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Color Picker Modal */}
      <Modal visible={showColorPicker} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choisir une couleur</Text>
              <TouchableOpacity onPress={() => {
                setShowColorPicker(false);
                setColorPickerItem(null);
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {colorPickerItem && (
              <Text style={[styles.colorPickerSubtitle, { color: colors.textSecondary }]}>{colorPickerItem.title}</Text>
            )}

            <ColorPicker selectedColor={tempColor} onColorSelect={setTempColor} />

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: accentColor }]}
              onPress={handleSaveColor}
            >
              <Text style={styles.createButtonText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal visible={showRenameModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {renameType === 'course' ? 'Renommer le cours' : 'Renommer la section'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowRenameModal(false);
                setRenameItem(null);
                setNewName('');
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.surfaceVariant, borderColor: colors.border, color: colors.text }]}
              placeholder="Nouveau nom"
              placeholderTextColor={colors.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />

            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: accentColor }, isSubmitting && styles.createButtonDisabled]}
              onPress={handleRename}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.createButtonText}>Renommer</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }, isDesktop && styles.modalContentDesktop]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {deleteAction === 'delete' ? 'Supprimer' : 'Masquer'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowDeleteModal(false);
                setDeleteItem(null);
              }}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.deleteConfirmText, { color: colors.textSecondary }]}>
              {deleteAction === 'delete'
                ? `Supprimer définitivement "${deleteItem?.title}" et toutes ses données ?`
                : `Masquer "${deleteItem?.title}" de votre liste ? Vous pourrez le restaurer depuis le filtre "Masqués".`}
            </Text>

            <View style={styles.deleteButtonRow}>
              <TouchableOpacity
                style={[styles.cancelDeleteButton, { borderColor: colors.border }]}
                onPress={() => {
                  setShowDeleteModal(false);
                  setDeleteItem(null);
                }}
              >
                <Text style={[styles.cancelDeleteText, { color: colors.text }]}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteButton, { backgroundColor: '#EF4444' }]}
                onPress={confirmDelete}
              >
                <Text style={styles.confirmDeleteText}>
                  {deleteAction === 'delete' ? 'Supprimer' : 'Masquer'}
                </Text>
              </TouchableOpacity>
            </View>
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
        isChapter={selectedItem?.level === 0}
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
    paddingBottom: 100,
  },
  scrollContentDesktop: {
    padding: 32,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  headerDesktop: {
    padding: 0,
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
    fontSize: 15,
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
  filterContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    paddingRight: 20,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
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
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#3B82F6',
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  addSectionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  contentWrapper: {
    paddingHorizontal: 20,
  },
  contentWrapperDesktop: {
    paddingHorizontal: 0,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
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
    alignItems: 'flex-start',
    justifyContent: 'center',
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
    width: 420,
    maxWidth: '100%',
    alignSelf: 'flex-start',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  chapterColorBar: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
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
    fontSize: 17,
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
    gap: 8,
  },
  actionButton: {
    padding: 6,
  },
  planChapterButton: {
    backgroundColor: '#D1FAE5',
    borderRadius: 6,
    marginRight: 4,
  },
  personalBadge: {
    backgroundColor: '#F3E8FF',
    padding: 4,
    borderRadius: 6,
  },
  personalBadgeSmall: {
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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
    paddingVertical: 4,
    paddingRight: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  courseColorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 16,
    marginRight: 8,
  },
  courseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingRight: 8,
  },
  courseInfo: {
    flex: 1,
    gap: 4,
  },
  courseBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courseTitle: {
    fontSize: 15,
    color: '#374151',
  },
  colorButton: {
    padding: 10,
  },
  editButton: {
    padding: 10,
  },
  deleteButton: {
    padding: 10,
  },
  addToCourseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 6,
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
    maxHeight: '85%',
  },
  modalContentDesktop: {
    maxWidth: 480,
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
    color: '#1F2937',
  },
  colorLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  colorPickerSubtitle: {
    fontSize: 15,
    color: '#3B82F6',
    marginBottom: 16,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  createButtonDisabled: {
    opacity: 0.7,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Hidden items styles
  filterButtonHidden: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  sectionEditButton: {
    marginLeft: 4,
    padding: 4,
    borderRadius: 4,
  },
  hiddenSection: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  hiddenSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  hiddenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  hiddenItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hiddenItemTitle: {
    fontSize: 14,
    color: '#4B5563',
    flex: 1,
  },
  unhideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EBF5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unhideButtonText: {
    fontSize: 13,
    color: '#3B82F6',
    fontWeight: '500',
  },
  emptyHiddenSection: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyHiddenText: {
    fontSize: 14,
    color: '#10B981',
    marginTop: 8,
  },
  deleteConfirmText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
  },
  deleteButtonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelDeleteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmDeleteButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
