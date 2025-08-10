import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  RefreshControl,
  StatusBar,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DatabaseService } from '../services/DatabaseService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const LibraryScreen = ({ navigation }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('dateAdded'); // dateAdded, title, lastRead
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc
  const [filterBy, setFilterBy] = useState('all'); // all, favorites, ongoing, completed

  useFocusEffect(
    useCallback(() => {
      loadBookmarks();
    }, [])
  );

  useEffect(() => {
    filterAndSortBookmarks();
  }, [bookmarks, searchQuery, sortBy, sortOrder, filterBy]);

  const loadBookmarks = async () => {
    try {
      setIsLoading(true);
      const bookmarkedManga = await DatabaseService.getBookmarkedManga();
      setBookmarks(bookmarkedManga);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      Alert.alert('Error', 'Failed to load library');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadBookmarks();
    setRefreshing(false);
  };

  const filterAndSortBookmarks = () => {
    let filtered = [...bookmarks];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(manga =>
        manga.title.toLowerCase().includes(query) ||
        (manga.genre && manga.genre.toLowerCase().includes(query)) ||
        (manga.description && manga.description.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'favorites':
        filtered = filtered.filter(manga => manga.isFavorite === 1);
        break;
      case 'ongoing':
        filtered = filtered.filter(manga => 
          manga.status && manga.status.toLowerCase().includes('ongoing')
        );
        break;
      case 'completed':
        filtered = filtered.filter(manga => 
          manga.status && manga.status.toLowerCase().includes('completed')
        );
        break;
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'lastRead':
          aValue = a.lastRead || 0;
          bValue = b.lastRead || 0;
          break;
        case 'dateAdded':
        default:
          aValue = a.dateAdded || 0;
          bValue = b.dateAdded || 0;
          break;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredBookmarks(filtered);
  };

  const openManga = (manga) => {
    navigation.navigate('Browser', {
      url: manga.url,
      title: manga.title
    });
  };

  const toggleFavorite = async (manga) => {
    try {
      const newFavoriteStatus = manga.isFavorite === 1 ? 0 : 1;
      await DatabaseService.updateBookmark(manga.url, {
        isFavorite: newFavoriteStatus
      });
      
      // Update local state
      setBookmarks(prevBookmarks =>
        prevBookmarks.map(bookmark =>
          bookmark.url === manga.url
            ? { ...bookmark, isFavorite: newFavoriteStatus }
            : bookmark
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const removeManga = (manga) => {
    Alert.alert(
      'Remove Manga',
      `Remove "${manga.title}" from library?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.removeBookmark(manga.url);
              setBookmarks(prevBookmarks =>
                prevBookmarks.filter(bookmark => bookmark.url !== manga.url)
              );
            } catch (error) {
              console.error('Error removing manga:', error);
              Alert.alert('Error', 'Failed to remove manga');
            }
          }
        }
      ]
    );
  };

  const showSortOptions = () => {
    Alert.alert(
      'Sort Library',
      'Choose sorting option',
      [
        { text: 'Date Added (Newest)', onPress: () => { setSortBy('dateAdded'); setSortOrder('desc'); } },
        { text: 'Date Added (Oldest)', onPress: () => { setSortBy('dateAdded'); setSortOrder('asc'); } },
        { text: 'Title (A-Z)', onPress: () => { setSortBy('title'); setSortOrder('asc'); } },
        { text: 'Title (Z-A)', onPress: () => { setSortBy('title'); setSortOrder('desc'); } },
        { text: 'Last Read (Recent)', onPress: () => { setSortBy('lastRead'); setSortOrder('desc'); } },
        { text: 'Last Read (Oldest)', onPress: () => { setSortBy('lastRead'); setSortOrder('asc'); } },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const showFilterOptions = () => {
    Alert.alert(
      'Filter Library',
      'Choose filter option',
      [
        { text: 'All Manga', onPress: () => setFilterBy('all') },
        { text: 'Favorites Only', onPress: () => setFilterBy('favorites') },
        { text: 'Ongoing', onPress: () => setFilterBy('ongoing') },
        { text: 'Completed', onPress: () => setFilterBy('completed') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const renderMangaItem = ({ item }) => (
    <TouchableOpacity style={styles.mangaItem} onPress={() => openManga(item)}>
      <View style={styles.mangaThumbnail}>
        <Text style={styles.mangaThumbnailText}>📚</Text>
      </View>
      
      <View style={styles.mangaInfo}>
        <Text style={styles.mangaTitle} numberOfLines={2}>{item.title}</Text>
        
        {item.currentChapter && (
          <Text style={styles.mangaChapter} numberOfLines={1}>
            Last read: {item.currentChapter}
          </Text>
        )}
        
        {item.status && (
          <Text style={styles.mangaStatus} numberOfLines={1}>
            Status: {item.status}
          </Text>
        )}
        
        {item.genre && (
          <Text style={styles.mangaGenre} numberOfLines={1}>
            {item.genre}
          </Text>
        )}
        
        <Text style={styles.mangaSite}>
          {item.site} • {new Date(item.dateAdded).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.mangaActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleFavorite(item)}
        >
          <Icon
            name={item.isFavorite === 1 ? "favorite" : "favorite-border"}
            size={20}
            color={item.isFavorite === 1 ? "#FF3B30" : "#666"}
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => removeManga(item)}
        >
          <Icon name="delete" size={20} color="#666" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="library-books" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Manga in Library</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery.trim() 
          ? `No manga found for "${searchQuery}"`
          : 'Start browsing manga sites and bookmark your favorites!'
        }
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Browse Manga</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Library</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={showFilterOptions} style={styles.headerButton}>
            <Icon name="filter-list" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={showSortOptions} style={styles.headerButton}>
            <Icon name="sort" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search your library..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Icon name="clear" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Info */}
      {(filterBy !== 'all' || searchQuery.trim()) && (
        <View style={styles.filterInfo}>
          <Text style={styles.filterText}>
            {filteredBookmarks.length} of {bookmarks.length} manga
            {filterBy !== 'all' && ` • ${filterBy}`}
            {searchQuery.trim() && ` • "${searchQuery}"`}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setSearchQuery('');
              setFilterBy('all');
            }}
            style={styles.clearFiltersButton}
          >
            <Text style={styles.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Manga List */}
      <FlatList
        data={filteredBookmarks}
        renderItem={renderMangaItem}
        keyExtractor={(item) => item.url}
        style={styles.list}
        contentContainerStyle={filteredBookmarks.length === 0 ? styles.emptyContainer : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
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
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 5,
    marginRight: 15,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 5,
    marginLeft: 10,
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
    height: 45,
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
  filterInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  clearFiltersButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearFiltersText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  mangaItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 5,
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  mangaThumbnail: {
    width: 60,
    height: 80,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  mangaThumbnailText: {
    fontSize: 24,
  },
  mangaInfo: {
    flex: 1,
    justifyContent: 'space-between',
  },
  mangaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  mangaChapter: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  mangaStatus: {
    fontSize: 12,
    color: '#34C759',
    marginBottom: 2,
  },
  mangaGenre: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  mangaSite: {
    fontSize: 11,
    color: '#999',
  },
  mangaActions: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginLeft: 10,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
  browseButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  browseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LibraryScreen;

