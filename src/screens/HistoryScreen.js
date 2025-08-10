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

const HistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [groupBy, setGroupBy] = useState('date'); // date, site, none

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  useEffect(() => {
    filterHistory();
  }, [history, searchQuery]);

  const loadHistory = async () => {
    try {
      setIsLoading(true);
      const historyData = await DatabaseService.getHistory(500);
      setHistory(historyData);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadHistory();
    setRefreshing(false);
  };

  const filterHistory = () => {
    let filtered = [...history];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        (item.domain && item.domain.toLowerCase().includes(query)) ||
        (item.chapterTitle && item.chapterTitle.toLowerCase().includes(query))
      );
    }

    setFilteredHistory(filtered);
  };

  const groupHistoryByDate = (historyData) => {
    const grouped = {};
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    historyData.forEach(item => {
      const itemDate = new Date(item.timestamp);
      let dateKey;

      if (itemDate.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (itemDate.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      } else {
        dateKey = itemDate.toLocaleDateString();
      }

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(item);
    });

    return grouped;
  };

  const groupHistoryBySite = (historyData) => {
    const grouped = {};

    historyData.forEach(item => {
      const site = item.domain || 'Unknown';
      if (!grouped[site]) {
        grouped[site] = [];
      }
      grouped[site].push(item);
    });

    return grouped;
  };

  const openHistoryItem = (item) => {
    navigation.navigate('Browser', {
      url: item.url,
      title: item.title
    });
  };

  const removeHistoryItem = (item) => {
    Alert.alert(
      'Remove from History',
      `Remove "${item.title}" from history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              // Remove from database (you'll need to add this method to DatabaseService)
              // For now, just remove from local state
              setHistory(prevHistory =>
                prevHistory.filter(historyItem => historyItem.id !== item.id)
              );
            } catch (error) {
              console.error('Error removing history item:', error);
              Alert.alert('Error', 'Failed to remove item');
            }
          }
        }
      ]
    );
  };

  const clearAllHistory = () => {
    Alert.alert(
      'Clear All History',
      'Are you sure you want to clear all browsing history? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.clearHistory();
              setHistory([]);
              setFilteredHistory([]);
            } catch (error) {
              console.error('Error clearing history:', error);
              Alert.alert('Error', 'Failed to clear history');
            }
          }
        }
      ]
    );
  };

  const showGroupOptions = () => {
    Alert.alert(
      'Group History',
      'Choose grouping option',
      [
        { text: 'By Date', onPress: () => setGroupBy('date') },
        { text: 'By Site', onPress: () => setGroupBy('site') },
        { text: 'No Grouping', onPress: () => setGroupBy('none') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now - date) / (1000 * 60));
      return `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderHistoryItem = ({ item }) => (
    <TouchableOpacity style={styles.historyItem} onPress={() => openHistoryItem(item)}>
      <View style={styles.historyIcon}>
        <Icon name="history" size={20} color="#666" />
      </View>
      
      <View style={styles.historyInfo}>
        <Text style={styles.historyTitle} numberOfLines={2}>{item.title}</Text>
        
        {item.chapterTitle && (
          <Text style={styles.historyChapter} numberOfLines={1}>
            {item.chapterTitle}
          </Text>
        )}
        
        <View style={styles.historyMeta}>
          <Text style={styles.historyDomain}>{item.domain}</Text>
          <Text style={styles.historyTime}>{formatTime(item.timestamp)}</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => removeHistoryItem(item)}
      >
        <Icon name="close" size={18} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderGroupedHistory = () => {
    if (groupBy === 'none') {
      return (
        <FlatList
          data={filteredHistory}
          renderItem={renderHistoryItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
          contentContainerStyle={filteredHistory.length === 0 ? styles.emptyContainer : null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      );
    }

    const grouped = groupBy === 'date' 
      ? groupHistoryByDate(filteredHistory)
      : groupHistoryBySite(filteredHistory);

    const sections = Object.keys(grouped).map(key => ({
      title: key,
      data: grouped[key]
    }));

    return (
      <FlatList
        data={sections}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.data.map((item, index) => (
              <View key={item.id}>
                {renderHistoryItem({ item })}
              </View>
            ))}
          </View>
        )}
        keyExtractor={(item) => item.title}
        style={styles.list}
        contentContainerStyle={sections.length === 0 ? styles.emptyContainer : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="history" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No History</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery.trim() 
          ? `No history found for "${searchQuery}"`
          : 'Your browsing history will appear here'
        }
      </Text>
      {!searchQuery.trim() && (
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.browseButtonText}>Start Browsing</Text>
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
        <Text style={styles.headerTitle}>History</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={showGroupOptions} style={styles.headerButton}>
            <Icon name="group-work" size={24} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAllHistory} style={styles.headerButton}>
            <Icon name="delete-sweep" size={24} color="#333" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search history..."
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

      {/* Results Info */}
      {searchQuery.trim() && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredHistory.length} result{filteredHistory.length !== 1 ? 's' : ''} for "{searchQuery}"
          </Text>
        </View>
      )}

      {/* History List */}
      {renderGroupedHistory()}
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
  resultsInfo: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  resultsText: {
    fontSize: 14,
    color: '#666',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
  },
  historyItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  historyIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  historyInfo: {
    flex: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  historyChapter: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  historyMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDomain: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  removeButton: {
    padding: 8,
    marginLeft: 10,
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

export default HistoryScreen;

