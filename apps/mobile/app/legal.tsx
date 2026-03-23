import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../src/contexts/ThemeContext';

type LegalPage = 'privacy' | 'terms' | 'cookies';

export default function LegalScreen() {
  const router = useRouter();
  const { page } = useLocalSearchParams<{ page?: string }>();
  const { width } = useWindowDimensions();
  const isDesktop = width > 768;
  const { colors, isDark } = useTheme();
  
  const [activePage, setActivePage] = useState<LegalPage>((page as LegalPage) || 'privacy');

  const pages = [
    { id: 'privacy', title: 'Politique de Confidentialité', icon: 'shield-checkmark' },
    { id: 'terms', title: 'Conditions d\'Utilisation', icon: 'document-text' },
    { id: 'cookies', title: 'Politique des Cookies', icon: 'information-circle' },
  ];

  const renderPrivacyPolicy = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Collecte des données</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        MyStudyPlanner collecte les données suivantes pour fournir ses services :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Adresse email (pour l'authentification)</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Données de révision (cours, sessions, progression)</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Événements personnels du calendrier</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Préférences d'utilisation</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Utilisation des données</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Vos données sont utilisées exclusivement pour :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Fournir les fonctionnalités de l'application</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Synchroniser vos données entre appareils</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Améliorer nos services</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Vous envoyer des notifications de révision (si activées)</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Partage des données</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Nous ne vendons jamais vos données personnelles. Vos données peuvent être partagées uniquement avec :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Nos hébergeurs (pour le stockage sécurisé)</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Les autorités si la loi l'exige</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Sécurité</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Nous protégeons vos données avec :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Chiffrement HTTPS pour les transferts</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Mots de passe hashés (bcrypt)</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Tokens JWT sécurisés</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Accès restreint aux bases de données</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Vos droits (RGPD)</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Conformément au RGPD, vous avez le droit de :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Accéder à vos données personnelles</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Rectifier vos données</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Supprimer votre compte et toutes vos données</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Exporter vos données</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Retirer votre consentement</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Pour exercer ces droits, contactez-nous à : contact@mystudyplanner.app
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Conservation des données</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Vos données sont conservées tant que votre compte est actif. Après suppression de votre compte, toutes vos données sont définitivement effacées sous 30 jours.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Contact</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Pour toute question concernant cette politique :{'\n'}
        Email : contact@mystudyplanner.app
      </Text>

      <Text style={[styles.updateDate, { color: colors.textTertiary, borderTopColor: colors.border }]}>Dernière mise à jour : Mars 2026</Text>
    </>
  );

  const renderTermsOfUse = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Acceptation des conditions</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        En utilisant MyStudyPlanner, vous acceptez les présentes conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Description du service</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        MyStudyPlanner est une application de planification de révisions pour étudiants. Elle permet de :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Organiser ses cours et chapitres</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Planifier des sessions de révision</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Utiliser différentes méthodes de mémorisation</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Suivre sa progression</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Compte utilisateur</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Vous êtes responsable de :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Maintenir la confidentialité de vos identifiants</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Toutes les activités sur votre compte</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Nous informer de tout accès non autorisé</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Utilisation acceptable</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Vous vous engagez à ne pas :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Utiliser l'application à des fins illégales</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Tenter de pirater ou compromettre le service</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Créer plusieurs comptes pour contourner les limitations</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Revendre ou redistribuer le service</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Propriété intellectuelle</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        L'application, son code, son design et son contenu sont protégés par le droit d'auteur. Vous bénéficiez d'une licence d'utilisation personnelle et non-exclusive.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Limitation de responsabilité</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        MyStudyPlanner est fourni "tel quel". Nous ne garantissons pas :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Un fonctionnement sans interruption</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• L'absence de bugs</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Vos résultats académiques</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        En aucun cas nous ne serons responsables de dommages indirects liés à l'utilisation de l'application.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>7. Modifications du service</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Nous nous réservons le droit de modifier, suspendre ou arrêter le service à tout moment, avec ou sans préavis.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>8. Résiliation</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Nous pouvons suspendre ou supprimer votre compte en cas de violation de ces conditions. Vous pouvez supprimer votre compte à tout moment depuis les paramètres.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>9. Droit applicable</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Ces conditions sont régies par le droit français. Tout litige sera soumis aux tribunaux compétents de Paris.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>10. Contact</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Pour toute question : contact@mystudyplanner.app
      </Text>

      <Text style={[styles.updateDate, { color: colors.textTertiary, borderTopColor: colors.border }]}>Dernière mise à jour : Mars 2026</Text>
    </>
  );

  const renderCookiePolicy = () => (
    <>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>1. Qu'est-ce qu'un cookie ?</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Un cookie est un petit fichier texte stocké sur votre appareil lorsque vous utilisez une application ou un site web. Les cookies permettent de mémoriser vos préférences et d'améliorer votre expérience.
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>2. Cookies utilisés</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        MyStudyPlanner utilise les types de stockage suivants :
      </Text>

      <Text style={[styles.subSectionTitle, { color: colors.text }]}>Stockage essentiel (obligatoire)</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Token d'authentification : Pour vous maintenir connecté</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Préférences utilisateur : Thème, langue, etc.</Text>

      <Text style={[styles.subSectionTitle, { color: colors.text }]}>Stockage fonctionnel</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Cache local : Pour améliorer les performances</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• État de l'application : Pour reprendre là où vous étiez</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>3. Cookies tiers</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Nous n'utilisons PAS de cookies tiers pour :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• La publicité</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Le tracking marketing</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• L'analyse comportementale à des fins commerciales</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>4. Gestion des cookies</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Sur l'application mobile, les données sont stockées via AsyncStorage/SecureStore. Vous pouvez les supprimer en :
      </Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Vous déconnectant de l'application</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Supprimant les données de l'application dans les paramètres de votre téléphone</Text>
      <Text style={[styles.listItem, { color: colors.textSecondary }]}>• Supprimant votre compte</Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>5. Durée de conservation</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        • Token d'authentification : Jusqu'à déconnexion{'\n'}
        • Préférences : Jusqu'à suppression du compte{'\n'}
        • Cache : 7 jours maximum
      </Text>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>6. Contact</Text>
      <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
        Pour toute question sur notre utilisation des cookies :{'\n'}
        contact@mystudyplanner.app
      </Text>

      <Text style={[styles.updateDate, { color: colors.textTertiary, borderTopColor: colors.border }]}>Dernière mise à jour : Mars 2026</Text>
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Informations Légales</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={[styles.content, isDesktop && styles.contentDesktop]}>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }, isDesktop && [styles.tabsDesktop, { borderRightColor: colors.border }]]}>
          {pages.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.tab, activePage === p.id && [styles.tabActive, { backgroundColor: isDark ? colors.primaryLight : '#EBF5FF' }]]}
              onPress={() => setActivePage(p.id as LegalPage)}
            >
              <Ionicons 
                name={p.icon as any} 
                size={20} 
                color={activePage === p.id ? '#3B82F6' : colors.textSecondary} 
              />
              <Text style={[styles.tabText, { color: colors.textSecondary }, activePage === p.id && styles.tabTextActive]}>
                {isDesktop ? p.title : p.title.split(' ')[0]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.legalContent, isDesktop && styles.legalContentDesktop]}>
            <Text style={[styles.pageTitle, { color: colors.text }]}>
              {pages.find(p => p.id === activePage)?.title}
            </Text>
            
            {activePage === 'privacy' && renderPrivacyPolicy()}
            {activePage === 'terms' && renderTermsOfUse()}
            {activePage === 'cookies' && renderCookiePolicy()}
          </View>
        </ScrollView>
      </View>
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
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    flex: 1,
  },
  contentDesktop: {
    flexDirection: 'row',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tabsDesktop: {
    flexDirection: 'column',
    width: 280,
    borderBottomWidth: 0,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    paddingTop: 20,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: '#3B82F6',
    backgroundColor: '#EBF5FF',
  },
  tabText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
  },
  scrollContent: {
    flex: 1,
  },
  legalContent: {
    padding: 20,
  },
  legalContentDesktop: {
    maxWidth: 800,
    paddingHorizontal: 40,
    paddingVertical: 30,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 12,
  },
  subSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    lineHeight: 24,
    color: '#4B5563',
    marginLeft: 8,
    marginBottom: 4,
  },
  updateDate: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    fontStyle: 'italic',
  },
});
