import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  Dimensions,
  BackHandler,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MangaWebView from '../components/MangaWebView';
import { DatabaseService } from '../services/DatabaseService';

const { width } = Dimensions.get('window');

const BrowserScreen = ({ route, navigation }) => {
  const { url: initialUrl, title: initialTitle } = route.params || {};
  
  const [currentUrl, setCurrentUrl] = useState(initialUrl || 'https://komikcast.li/');
  const [currentTitle, setCurrentTitle] = useState(initialTitle || 'Manga Reader');
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  
  const webViewRef = useRef(null);

  useEffect(() => {
    checkIfBookmarked();
  }, [currentUrl]);

  useEffect(() => {
    const backAction = () => {
      if (canGoBack) {
        webViewRef.current?.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [canGoBack]);

  const checkIfBookmarked = async () => {
    try {
      const bookmarks = await DatabaseService.getBookmarkedManga();
      const isBookmarkedManga = bookmarks.some(bookmark => bookmark.url === currentUrl);
      setIsBookmarked(isBookmarkedManga);
    } catch (error) {
      console.error('Error checking bookmark status:', error);
    }
  };

  const handleNavigationStateChange = (navState) => {
    setCurrentUrl(navState.url);
    setCurrentTitle(navState.title || 'Manga Reader');
    setUrlInput(navState.url);
    setIsLoading(navState.loading);
    setCanGoBack(navState.canGoBack);
    setCanGoForward(navState.canGoForward);
    
    // Update reading history
    updateReadingHistory(navState);
  };

  const updateReadingHistory = async (navState) => {
    try {
      await DatabaseService.addToHistory({
        title: navState.title || 'Unknown',
        url: navState.url,
        timestamp: Date.now(),
        domain: new URL(navState.url).hostname,
      });
    } catch (error) {
      console.error('Error updating history:', error);
    }
  };

  const handleBookmarkAdd = async (mangaData) => {
    try {
      await DatabaseService.addBookmark(mangaData);
      setIsBookmarked(true);
      Alert.alert('Success', 'Manga added to library!');
    } catch (error) {
      console.error('Error adding bookmark:', error);
      Alert.alert('Error', 'Failed to add bookmark');
    }
  };

  const handleChapterProgress = async (progressData) => {
    try {
      await DatabaseService.updateReadingProgress(progressData);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const toggleBookmark = async () => {
    try {
      if (isBookmarked) {
        await DatabaseService.removeBookmark(currentUrl);
        setIsBookmarked(false);
        Alert.alert('Removed', 'Manga removed from library');
      } else {
        // Try to extract manga info from current page
        const mangaData = {
          title: currentTitle,
          url: currentUrl,
          thumbnail: null,
          description: null,
          genre: null,
          status: null,
          site: new URL(currentUrl).hostname,
          dateAdded: Date.now(),
        };
        
        await DatabaseService.addBookmark(mangaData);
        setIsBookmarked(true);
        Alert.alert('Added', 'Manga added to library!');
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      Alert.alert('Error', 'Failed to update bookmark');
    }
  };

  const navigateToUrl = () => {
    if (urlInput.trim()) {
      let url = urlInput.trim();
      
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
      }
      
      setCurrentUrl(url);
      setShowUrlBar(false);
    }
  };

  const goBack = () => {
    if (webViewRef.current && canGoBack) {
      webViewRef.current.goBack();
    }
  };

  const goForward = () => {
    if (webViewRef.current && canGoForward) {
      webViewRef.current.goForward();
    }
  };

  const refresh = () => {
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const goHome = () => {
    setCurrentUrl('https://komikcast.li/');
  };

  const shareUrl = () => {
    // Implement share functionality
    Alert.alert('Share', `Share: ${currentTitle}\n${currentUrl}`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navButton}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.urlContainer} 
          onPress={() => setShowUrlBar(!showUrlBar)}
        >
          <Text style={styles.urlText} numberOfLines={1}>
            {currentTitle || new URL(currentUrl).hostname}
          </Text>
          <Icon name="expand-more" size={20} color="#666" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={toggleBookmark} style={styles.navButton}>
          <Icon 
            name={isBookmarked ? "bookmark" : "bookmark-border"} 
            size={24} 
            color={isBookmarked ? "#007AFF" : "#333"} 
          />
        </TouchableOpacity>
      </View>

      {/* URL Input Bar */}
      {showUrlBar && (
        <View style={styles.urlInputContainer}>
          <TextInput
            style={styles.urlInput}
            value={urlInput}
            onChangeText={setUrlInput}
            onSubmitEditing={navigateToUrl}
            placeholder="Enter URL or search..."
            autoCapitalize="none"
            autoCorrect={false}
            selectTextOnFocus={true}
          />
          <TouchableOpacity onPress={navigateToUrl} style={styles.goButton}>
            <Icon name="arrow-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* WebView */}
      <MangaWebView
        ref={webViewRef}
        url={currentUrl}
        onNavigationStateChange={handleNavigationStateChange}
        onBookmarkAdd={handleBookmarkAdd}
        onChapterProgress={handleChapterProgress}
        style={styles.webview}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomBar}>
        <TouchableOpacity 
          onPress={goBack} 
          style={[styles.navButton, !canGoBack && styles.disabledButton]}
          disabled={!canGoBack}
        >
          <Icon name="arrow-back" size={24} color={canGoBack ? "#333" : "#ccc"} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={goForward} 
          style={[styles.navButton, !canGoForward && styles.disabledButton]}
          disabled={!canGoForward}
        >
          <Icon name="arrow-forward" size={24} color={canGoForward ? "#333" : "#ccc"} />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={refresh} style={styles.navButton}>
          <Icon name="refresh" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={goHome} style={styles.navButton}>
          <Icon name="home" size={24} color="#333" />
        </TouchableOpacity>
        
        <TouchableOpacity onPress={shareUrl} style={styles.navButton}>
          <Icon name="share" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Loading Indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBar} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  navButton: {
    padding: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  urlContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginHorizontal: 10,
  },
  urlText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  urlInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
  },
  goButton: {
    padding: 10,
  },
  webview: {
    flex: 1,
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#f8f9fa',
  },
  loadingBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    width: '30%',
    // Add animation here if needed
  },
});

export default BrowserScreen;

