import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  BackHandler,
  StatusBar,
  Dimensions,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { DatabaseService } from '../services/DatabaseService';
import { InjectionScripts } from '../utils/InjectionScripts';

const { width, height } = Dimensions.get('window');

const MangaWebView = ({ 
  url, 
  onNavigationStateChange, 
  onBookmarkAdd,
  onChapterProgress,
  style 
}) => {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const backAction = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [canGoBack]);

  const handleNavigationStateChange = (navState) => {
    setCanGoBack(navState.canGoBack);
    setCurrentUrl(navState.url);
    setIsLoading(navState.loading);
    
    if (onNavigationStateChange) {
      onNavigationStateChange(navState);
    }
  };

  const handleMessage = async (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      
      switch (data.type) {
        case 'BOOKMARK_ADD':
          if (onBookmarkAdd) {
            await onBookmarkAdd({
              title: data.title,
              url: data.url,
              thumbnail: data.thumbnail,
              description: data.description,
              genre: data.genre,
              status: data.status,
            });
          }
          break;
          
        case 'CHAPTER_PROGRESS':
          if (onChapterProgress) {
            await onChapterProgress({
              mangaUrl: data.mangaUrl,
              chapterUrl: data.chapterUrl,
              chapterTitle: data.chapterTitle,
              currentPage: data.currentPage,
              totalPages: data.totalPages,
              scrollPosition: data.scrollPosition,
            });
          }
          break;
          
        case 'DOWNLOAD_CHAPTER':
          // Handle chapter download request
          Alert.alert(
            'Download Chapter',
            `Download ${data.chapterTitle}?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Download', onPress: () => handleDownload(data) },
            ]
          );
          break;
          
        case 'PAGE_INFO':
          // Handle page information for tracking
          console.log('Page Info:', data);
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('Error handling WebView message:', error);
    }
  };

  const handleDownload = async (data) => {
    try {
      // Implement download logic here
      console.log('Starting download for:', data.chapterTitle);
      // This will be implemented in the download service
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Failed to start download');
    }
  };

  const injectedJavaScript = `
    ${InjectionScripts.getBaseScript()}
    ${InjectionScripts.getMangaReaderScript()}
    ${InjectionScripts.getAdBlockScript()}
    true;
  `;

  const onLoadEnd = () => {
    setIsLoading(false);
    
    // Inject additional scripts after page load
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'INIT_MANGA_READER',
        url: currentUrl
      }));
    }
  };

  const onError = (syntheticEvent) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error: ', nativeEvent);
    Alert.alert('Error', 'Failed to load page');
  };

  return (
    <View style={[styles.container, style]}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <WebView
        ref={webViewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={handleNavigationStateChange}
        onMessage={handleMessage}
        onLoadEnd={onLoadEnd}
        onError={onError}
        injectedJavaScript={injectedJavaScript}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scalesPageToFit={true}
        allowsBackForwardNavigationGestures={true}
        mixedContentMode="compatibility"
        userAgent="Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36 MangaReader/1.0"
        onShouldStartLoadWithRequest={(request) => {
          // Allow all requests for now
          return true;
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
    width: width,
    height: height,
  },
});

export default MangaWebView;

