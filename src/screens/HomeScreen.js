import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DatabaseService } from '../services/DatabaseService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentManga, setRecentManga] = useState([]);
  const [bookmarkedManga, setBookmarkedManga] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeData();
  }, []);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      
      // Initialize database
      await DatabaseService.initDatabase();
      
      // Load recent manga
      const recent = await DatabaseService.getRecentManga(10);
      setRecentManga(recent);
      
      // Load bookmarked manga
      const bookmarks = await DatabaseService.getBookmarkedManga();
      setBookmarkedManga(bookmarks.slice(0, 6)); // Show only first 6
      
    } catch (error) {
      console.error('Error initializing data:', error);
      Alert.alert('Error', 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Navigate to browser with search query
      navigation.navigate('Browser', {
        url: `https://komikcast.li/?s=${encodeURIComponent(searchQuery.trim())}`,
        title: `Search: ${searchQuery.trim()}`
      });
    }
  };

  const navigateToSite = (siteName, url) => {
    navigation.navigate('Browser', {
      url: url,
      title: siteName
    });
  };

  const navigateToLibrary = () => {
    navigation.navigate('Library');
  };

  const navigateToHistory = () => {
    navigation.navigate('History');
  };

  const navigateToSettings = () => {
    navigation.navigate('Settings');
  };

  const openManga = (manga) => {
    navigation.navigate('Browser', {
      url: manga.url,
      title: manga.title
    });
  };

  const popularSites = [
    { name: 'KomikCast', url: 'https://komikcast.li/', icon: '📚', color: '#FF6B6B' },
    { name: 'Komiku', url: 'https://komiku.id/', icon: '📖', color: '#4ECDC4' },
    { name: 'MangaKu', url: 'https://mangaku.fun/', icon: '📝', color: '#45B7D1' },
    { name: 'WestManga', url: 'https://westmanga.info/', icon: '🌟', color: '#96CEB4' },
    { name: 'BacaManga', url: 'https://bacamanga.co/', icon: '📑', color: '#FFEAA7' },
    { name: 'MangaIndo', url: 'https://mangaindo.web.id/', icon: '📋', color: '#DDA0DD' },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Manga Reader</Text>
        <TouchableOpacity onPress={navigateToSettings} style={styles.settingsButton}>
          <Icon name="settings" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search manga..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
                <Icon name="clear" size={20} color="#666" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={navigateToLibrary}>
            <Icon name="bookmark" size={24} color="#007AFF" />
            <Text style={styles.quickActionText}>Library</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={navigateToHistory}>
            <Icon name="history" size={24} color="#34C759" />
            <Text style={styles.quickActionText}>History</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Downloads')}>
            <Icon name="download" size={24} color="#FF9500" />
            <Text style={styles.quickActionText}>Downloads</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.quickActionButton} onPress={() => navigation.navigate('Updates')}>
            <Icon name="notifications" size={24} color="#FF3B30" />
            <Text style={styles.quickActionText}>Updates</Text>
          </TouchableOpacity>
        </View>

        {/* Popular Sites */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Popular Sites</Text>
          <View style={styles.sitesGrid}>
            {popularSites.map((site, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.siteCard, { backgroundColor: site.color }]}
                onPress={() => navigateToSite(site.name, site.url)}
              >
                <Text style={styles.siteIcon}>{site.icon}</Text>
                <Text style={styles.siteName}>{site.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Manga */}
        {recentManga.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Continue Reading</Text>
              <TouchableOpacity onPress={navigateToHistory}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {recentManga.map((manga, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mangaCard}
                  onPress={() => openManga(manga)}
                >
                  <View style={styles.mangaThumbnail}>
                    <Text style={styles.mangaThumbnailText}>📖</Text>
                  </View>
                  <Text style={styles.mangaTitle} numberOfLines={2}>{manga.title}</Text>
                  <Text style={styles.mangaChapter} numberOfLines={1}>
                    {manga.lastChapter || 'Chapter 1'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bookmarked Manga */}
        {bookmarkedManga.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Library</Text>
              <TouchableOpacity onPress={navigateToLibrary}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
              {bookmarkedManga.map((manga, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.mangaCard}
                  onPress={() => openManga(manga)}
                >
                  <View style={styles.mangaThumbnail}>
                    <Text style={styles.mangaThumbnailText}>📚</Text>
                  </View>
                  <Text style={styles.mangaTitle} numberOfLines={2}>{manga.title}</Text>
                  <Text style={styles.mangaStatus} numberOfLines={1}>
                    {manga.status || 'Ongoing'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Getting Started */}
        {recentManga.length === 0 && bookmarkedManga.length === 0 && (
          <View style={styles.emptyState}>
            <Icon name="menu-book" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>Welcome to Manga Reader!</Text>
            <Text style={styles.emptyStateText}>
              Start by browsing your favorite manga sites or search for manga above.
            </Text>
            <TouchableOpacity
              style={styles.getStartedButton}
              onPress={() => navigateToSite('KomikCast', 'https://komikcast.li/')}
            >
              <Text style={styles.getStartedButtonText}>Browse KomikCast</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 5,
  },
  content: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 5,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    marginBottom: 10,
  },
  quickActionButton: {
    alignItems: 'center',
    padding: 10,
  },
  quickActionText: {
    marginTop: 5,
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  section: {
    backgroundColor: '#ffffff',
    marginBottom: 10,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  seeAllText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  sitesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  siteCard: {
    width: (width - 60) / 3,
    aspectRatio: 1,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  siteIcon: {
    fontSize: 24,
    marginBottom: 5,
  },
  siteName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
  },
  horizontalScroll: {
    paddingLeft: 20,
  },
  mangaCard: {
    width: 120,
    marginRight: 15,
  },
  mangaThumbnail: {
    width: 120,
    height: 160,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  mangaThumbnailText: {
    fontSize: 32,
  },
  mangaTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mangaChapter: {
    fontSize: 12,
    color: '#666',
  },
  mangaStatus: {
    fontSize: 12,
    color: '#007AFF',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  getStartedButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  getStartedButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;

