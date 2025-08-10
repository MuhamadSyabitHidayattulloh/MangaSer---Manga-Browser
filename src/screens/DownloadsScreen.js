import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DownloadService } from '../services/DownloadService';
import { DatabaseService } from '../services/DatabaseService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DownloadsScreen = ({ navigation }) => {
  const [downloads, setDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({});
  const [storageInfo, setStorageInfo] = useState({ totalSize: 0, fileCount: 0 });
  const [filterStatus, setFilterStatus] = useState('all'); // all, downloading, completed, failed
  const [sortBy, setSortBy] = useState('date'); // date, name, size
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    autoDownload: false,
    downloadQuality: 'high',
    maxConcurrentDownloads: 3,
    deleteAfterReading: false
  });

  useFocusEffect(
    useCallback(() => {
      loadDownloads();
      loadStorageInfo();
      loadSettings();
      
      // Set up progress monitoring
      const progressInterval = setInterval(updateDownloadProgress, 1000);
      
      return () => {
        clearInterval(progressInterval);
      };
    }, [])
  );

  const loadDownloads = async () => {
    try {
      setIsLoading(true);
      const downloadList = await DatabaseService.getDownloads();
      setDownloads(downloadList);
    } catch (error) {
      console.error('Error loading downloads:', error);
      Alert.alert('Error', 'Failed to load downloads');
    } finally {
      setIsLoading(false);
    }
  };

  const loadStorageInfo = async () => {
    try {
      const info = await DownloadService.getStorageUsage();
      setStorageInfo(info);
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const downloadSettings = {
        autoDownload: await DatabaseService.getSetting('autoDownload', false),
        downloadQuality: await DatabaseService.getSetting('downloadQuality', 'high'),
        maxConcurrentDownloads: await DatabaseService.getSetting('maxConcurrentDownloads', 3),
        deleteAfterReading: await DatabaseService.getSetting('deleteAfterReading', false)
      };
      setSettings(downloadSettings);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const updateDownloadProgress = async () => {
    try {
      const progress = await DownloadService.getDownloadProgress();
      setDownloadProgress(progress);
    } catch (error) {
      console.error('Error updating download progress:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadDownloads(),
      loadStorageInfo(),
      updateDownloadProgress()
    ]);
    setRefreshing(false);
  };

  const handleDownloadAction = (download, action) => {
    switch (action) {
      case 'pause':
        pauseDownload(download);
        break;
      case 'resume':
        resumeDownload(download);
        break;
      case 'cancel':
        cancelDownload(download);
        break;
      case 'delete':
        deleteDownload(download);
        break;
      case 'retry':
        retryDownload(download);
        break;
      case 'open':
        openDownload(download);
        break;
    }
  };

  const pauseDownload = async (download) => {
    try {
      const success = await DownloadService.pauseDownload(download.id);
      if (success) {
        loadDownloads();
      } else {
        Alert.alert('Error', 'Failed to pause download');
      }
    } catch (error) {
      console.error('Error pausing download:', error);
      Alert.alert('Error', 'Failed to pause download');
    }
  };

  const resumeDownload = async (download) => {
    try {
      const success = await DownloadService.resumeDownload(download.id);
      if (success) {
        loadDownloads();
      } else {
        Alert.alert('Error', 'Failed to resume download');
      }
    } catch (error) {
      console.error('Error resuming download:', error);
      Alert.alert('Error', 'Failed to resume download');
    }
  };

  const cancelDownload = (download) => {
    Alert.alert(
      'Cancel Download',
      `Cancel download of "${download.chapterTitle}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await DownloadService.cancelDownload(download.id);
              if (success) {
                loadDownloads();
                loadStorageInfo();
              } else {
                Alert.alert('Error', 'Failed to cancel download');
              }
            } catch (error) {
              console.error('Error cancelling download:', error);
              Alert.alert('Error', 'Failed to cancel download');
            }
          }
        }
      ]
    );
  };

  const deleteDownload = (download) => {
    Alert.alert(
      'Delete Download',
      `Delete "${download.chapterTitle}" and all downloaded files?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await DownloadService.deleteDownload(download.id);
              if (success) {
                loadDownloads();
                loadStorageInfo();
              } else {
                Alert.alert('Error', 'Failed to delete download');
              }
            } catch (error) {
              console.error('Error deleting download:', error);
              Alert.alert('Error', 'Failed to delete download');
            }
          }
        }
      ]
    );
  };

  const retryDownload = async (download) => {
    try {
      // This would restart the download
      const success = await DownloadService.resumeDownload(download.id);
      if (success) {
        loadDownloads();
      } else {
        Alert.alert('Error', 'Failed to retry download');
      }
    } catch (error) {
      console.error('Error retrying download:', error);
      Alert.alert('Error', 'Failed to retry download');
    }
  };

  const openDownload = (download) => {
    // Navigate to offline reader or file viewer
    navigation.navigate('OfflineReader', {
      downloadPath: download.downloadPath,
      chapterTitle: download.chapterTitle,
      mangaTitle: download.mangaTitle
    });
  };

  const clearAllDownloads = () => {
    Alert.alert(
      'Clear All Downloads',
      'This will delete all downloaded files and cannot be undone. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await DownloadService.clearAllDownloads();
              if (success) {
                loadDownloads();
                loadStorageInfo();
              } else {
                Alert.alert('Error', 'Failed to clear downloads');
              }
            } catch (error) {
              console.error('Error clearing downloads:', error);
              Alert.alert('Error', 'Failed to clear downloads');
            }
          }
        }
      ]
    );
  };

  const getFilteredDownloads = () => {
    let filtered = [...downloads];

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(download => download.status === filterStatus);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.chapterTitle.localeCompare(b.chapterTitle);
        case 'size':
          return (b.downloadedImages || 0) - (a.downloadedImages || 0);
        case 'date':
        default:
          return new Date(b.timestamp || 0) - new Date(a.timestamp || 0);
      }
    });

    return filtered;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#34C759';
      case 'downloading': return '#007AFF';
      case 'paused': return '#FF9500';
      case 'failed': return '#FF3B30';
      case 'cancelled': return '#8E8E93';
      default: return '#8E8E93';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'check-circle';
      case 'downloading': return 'download';
      case 'paused': return 'pause-circle-filled';
      case 'failed': return 'error';
      case 'cancelled': return 'cancel';
      default: return 'help';
    }
  };

  const renderDownloadItem = ({ item }) => {
    const progress = item.downloadedImages && item.totalImages 
      ? (item.downloadedImages / item.totalImages) * 100 
      : 0;

    const isCurrentDownload = downloadProgress.currentDownload?.id === item.id;

    return (
      <TouchableOpacity 
        style={styles.downloadItem}
        onPress={() => item.status === 'completed' ? openDownload(item) : null}
      >
        <View style={styles.downloadIcon}>
          <Icon 
            name={getStatusIcon(item.status)} 
            size={24} 
            color={getStatusColor(item.status)} 
          />
        </View>
        
        <View style={styles.downloadInfo}>
          <Text style={styles.downloadTitle} numberOfLines={2}>
            {item.chapterTitle}
          </Text>
          <Text style={styles.downloadManga} numberOfLines={1}>
            {item.mangaTitle}
          </Text>
          
          <View style={styles.downloadProgress}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${progress}%`,
                    backgroundColor: getStatusColor(item.status)
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {item.downloadedImages || 0}/{item.totalImages || 0}
            </Text>
          </View>
          
          <View style={styles.downloadMeta}>
            <Text style={styles.downloadStatus}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
            {isCurrentDownload && (
              <Text style={styles.downloadingIndicator}>Downloading...</Text>
            )}
          </View>
        </View>
        
        <View style={styles.downloadActions}>
          {item.status === 'downloading' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadAction(item, 'pause')}
            >
              <Icon name="pause" size={20} color="#FF9500" />
            </TouchableOpacity>
          )}
          
          {(item.status === 'paused' || item.status === 'failed') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadAction(item, 'resume')}
            >
              <Icon name="play-arrow" size={20} color="#34C759" />
            </TouchableOpacity>
          )}
          
          {item.status === 'completed' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDownloadAction(item, 'open')}
            >
              <Icon name="folder-open" size={20} color="#007AFF" />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDownloadAction(item, 'delete')}
          >
            <Icon name="delete" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="cloud-download" size={64} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Downloads</Text>
      <Text style={styles.emptyStateText}>
        Downloaded chapters will appear here
      </Text>
      <TouchableOpacity
        style={styles.browseButton}
        onPress={() => navigation.navigate('Home')}
      >
        <Text style={styles.browseButtonText}>Start Reading</Text>
      </TouchableOpacity>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Icon name="arrow-back" size={24} color="#333" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Downloads</Text>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.headerButton}>
          <Icon name="settings" size={24} color="#333" />
        </TouchableOpacity>
        <TouchableOpacity onPress={clearAllDownloads} style={styles.headerButton}>
          <Icon name="delete-sweep" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStorageInfo = () => (
    <View style={styles.storageInfo}>
      <View style={styles.storageItem}>
        <Icon name="storage" size={20} color="#666" />
        <Text style={styles.storageText}>
          {formatFileSize(storageInfo.totalSize)} used
        </Text>
      </View>
      <View style={styles.storageItem}>
        <Icon name="folder" size={20} color="#666" />
        <Text style={styles.storageText}>
          {storageInfo.fileCount} files
        </Text>
      </View>
      <View style={styles.storageItem}>
        <Icon name="download" size={20} color="#666" />
        <Text style={styles.storageText}>
          {downloads.length} downloads
        </Text>
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filters}>
      <View style={styles.filterGroup}>
        <Text style={styles.filterLabel}>Status:</Text>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'all' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('all')}
        >
          <Text style={[styles.filterButtonText, filterStatus === 'all' && styles.filterButtonTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('completed')}
        >
          <Text style={[styles.filterButtonText, filterStatus === 'completed' && styles.filterButtonTextActive]}>
            Completed
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filterStatus === 'downloading' && styles.filterButtonActive]}
          onPress={() => setFilterStatus('downloading')}
        >
          <Text style={[styles.filterButtonText, filterStatus === 'downloading' && styles.filterButtonTextActive]}>
            Active
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSettingsModal = () => (
    <Modal
      visible={showSettings}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettings(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Download Settings</Text>
          <TouchableOpacity onPress={() => setShowSettings(false)}>
            <Text style={styles.modalSave}>Done</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto Download New Chapters</Text>
            <Switch
              value={settings.autoDownload}
              onValueChange={(value) => setSettings({...settings, autoDownload: value})}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Delete After Reading</Text>
            <Switch
              value={settings.deleteAfterReading}
              onValueChange={(value) => setSettings({...settings, deleteAfterReading: value})}
            />
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Download Quality</Text>
            <TouchableOpacity style={styles.settingValue}>
              <Text style={styles.settingValueText}>{settings.downloadQuality}</Text>
              <Icon name="chevron-right" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Max Concurrent Downloads</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.maxConcurrentDownloads.toString()}
              onChangeText={(text) => setSettings({...settings, maxConcurrentDownloads: parseInt(text) || 1})}
              keyboardType="numeric"
            />
          </View>
        </View>
      </View>
    </Modal>
  );

  const filteredDownloads = getFilteredDownloads();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {renderHeader()}
      {renderStorageInfo()}
      {renderFilters()}
      
      <FlatList
        data={filteredDownloads}
        renderItem={renderDownloadItem}
        keyExtractor={(item) => item.id.toString()}
        style={styles.list}
        contentContainerStyle={filteredDownloads.length === 0 ? styles.emptyContainer : null}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
      
      {renderSettingsModal()}
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
  storageInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  storageItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  storageText: {
    marginLeft: 5,
    fontSize: 14,
    color: '#666',
  },
  filters: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#f8f9fa',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
  },
  filterButtonText: {
    fontSize: 12,
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#ffffff',
  },
  list: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
  },
  downloadItem: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 2,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  downloadIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  downloadInfo: {
    flex: 1,
  },
  downloadTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  downloadManga: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  downloadProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#e9ecef',
    borderRadius: 2,
    marginRight: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    minWidth: 50,
  },
  downloadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  downloadStatus: {
    fontSize: 12,
    color: '#666',
  },
  downloadingIndicator: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
  downloadActions: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  actionButton: {
    padding: 8,
    marginLeft: 5,
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSave: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    paddingTop: 20,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#ffffff',
    marginBottom: 1,
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 16,
    color: '#666',
    marginRight: 5,
  },
  settingInput: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
});

export default DownloadsScreen;

