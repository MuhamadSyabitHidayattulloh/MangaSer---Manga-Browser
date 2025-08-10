export class InjectionScripts {
  
  static getBaseScript() {
    return `
      // Base utility functions
      window.MangaReader = window.MangaReader || {};
      
      window.MangaReader.sendMessage = function(data) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      };
      
      window.MangaReader.log = function(message) {
        console.log('[MangaReader]', message);
      };
      
      // Utility to get page info
      window.MangaReader.getPageInfo = function() {
        return {
          title: document.title,
          url: window.location.href,
          domain: window.location.hostname,
        };
      };
      
      // Utility to detect if page is manga chapter
      window.MangaReader.isMangaChapter = function() {
        const url = window.location.href.toLowerCase();
        const indicators = ['chapter', 'ch-', '/ch/', 'baca', 'read'];
        return indicators.some(indicator => url.includes(indicator));
      };
      
      // Utility to detect if page is manga detail/info
      window.MangaReader.isMangaDetail = function() {
        const url = window.location.href.toLowerCase();
        const indicators = ['manga', 'komik', 'series'];
        const chapterIndicators = ['chapter', 'ch-', '/ch/', 'baca', 'read'];
        return indicators.some(indicator => url.includes(indicator)) && 
               !chapterIndicators.some(indicator => url.includes(indicator));
      };
    `;
  }
  
  static getMangaReaderScript() {
    return `
      // Enhanced manga reader specific scripts
      (function() {
        let isInitialized = false;
        let currentSite = '';
        
        function initMangaReader() {
          if (isInitialized) return;
          isInitialized = true;
          
          window.MangaReader.log('Initializing enhanced manga reader...');
          
          // Detect manga site and apply appropriate modifications
          const hostname = window.location.hostname.toLowerCase();
          currentSite = hostname;
          
          if (hostname.includes('komikcast')) {
            initKomikcastReader();
          } else if (hostname.includes('komiku')) {
            initKomikuReader();
          } else if (hostname.includes('mangaku')) {
            initMangakuReader();
          } else if (hostname.includes('westmanga') || hostname.includes('bacamanga')) {
            initWestmangaReader();
          } else if (hostname.includes('mangaindo')) {
            initMangaindoReader();
          } else {
            initGenericReader();
          }
          
          // Add floating action buttons
          addFloatingButtons();
          
          // Track reading progress
          trackReadingProgress();
          
          // Auto-hide UI elements for better reading experience
          optimizeForReading();
          
          // Add keyboard shortcuts
          addKeyboardShortcuts();
          
          // Auto-scroll functionality
          addAutoScrollFeature();
        }
        
        function initKomikcastReader() {
          window.MangaReader.log('Initializing Komikcast reader...');
          
          // Hide unnecessary elements
          const elementsToHide = [
            'header.header',
            '.header-wrapper',
            '.navbar',
            '.navigation',
            '.ads',
            '.advertisement',
            '.adsense',
            '.sidebar',
            '.footer',
            '#footer',
            '.social-share',
            '.comments',
            '.related-posts',
            '.popup',
            '.modal',
            '.overlay',
            '[class*="ad-"]',
            '[id*="ad-"]',
            'iframe[src*="ads"]',
            'script[src*="ads"]'
          ];
          
          elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el) {
                el.style.display = 'none';
                el.remove();
              }
            });
          });
          
          // Optimize manga reading area
          const readingArea = document.querySelector('#chapter_body, .main-reading-area, .reading-content, .entry-content');
          if (readingArea) {
            readingArea.style.cssText = \`
              max-width: 100% !important;
              margin: 0 !important;
              padding: 5px !important;
              background-color: #000 !important;
              text-align: center !important;
            \`;
          }
          
          // Optimize manga images
          const mangaImages = document.querySelectorAll('.main-reading-area img, #chapter_body img, .reading-content img, .entry-content img');
          mangaImages.forEach((img, index) => {
            img.style.cssText = \`
              width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 0 auto 2px auto !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
            \`;
            
            // Add loading placeholder
            img.addEventListener('load', function() {
              this.style.opacity = '1';
            });
            
            img.addEventListener('error', function() {
              this.style.display = 'none';
            });
            
            // Lazy loading for better performance
            if (index > 2) {
              img.loading = 'lazy';
            }
          });
          
          // Extract manga info for bookmarking
          const mangaInfo = extractKomikcastInfo();
          if (mangaInfo) {
            window.MangaReader.currentManga = mangaInfo;
          }
        }
        
        function initKomikuReader() {
          window.MangaReader.log('Initializing Komiku reader...');
          
          const elementsToHide = [
            '.header',
            '.navbar',
            '.sidebar',
            '.footer',
            '.ads',
            '.advertisement',
            '.social-buttons',
            '.comments-area'
          ];
          
          elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el && el.remove());
          });
          
          // Optimize reading area
          const readingArea = document.querySelector('.reading-content, .chapter-content, .entry-content');
          if (readingArea) {
            readingArea.style.cssText = \`
              background-color: #000 !important;
              padding: 5px !important;
              text-align: center !important;
            \`;
          }
          
          // Optimize images
          const images = document.querySelectorAll('.reading-content img, .chapter-content img, .entry-content img');
          images.forEach(img => {
            img.style.cssText = \`
              width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 0 auto 2px auto !important;
            \`;
          });
        }
        
        function initMangakuReader() {
          window.MangaReader.log('Initializing Mangaku reader...');
          
          const elementsToHide = [
            '.header-wrapper',
            '.navbar',
            '.sidebar',
            '.footer',
            '.ads',
            '.advertisement',
            '.social-buttons'
          ];
          
          elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el && el.remove());
          });
          
          // Optimize reading area
          const readingArea = document.querySelector('.reading-content, .chapter-content');
          if (readingArea) {
            readingArea.style.cssText = \`
              background-color: #000 !important;
              padding: 5px !important;
              text-align: center !important;
            \`;
          }
        }
        
        function initWestmangaReader() {
          window.MangaReader.log('Initializing Westmanga reader...');
          
          const elementsToHide = [
            '.site-header',
            '.site-footer',
            '.sidebar',
            '.ads',
            '.advertisement'
          ];
          
          elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el && el.remove());
          });
          
          // Optimize images
          const images = document.querySelectorAll('img[src*="manga"], img[src*="chapter"]');
          images.forEach(img => {
            img.style.cssText = \`
              width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 0 auto 2px auto !important;
            \`;
          });
        }
        
        function initMangaindoReader() {
          window.MangaReader.log('Initializing Mangaindo reader...');
          
          const elementsToHide = [
            '.header',
            '.navbar',
            '.sidebar',
            '.footer',
            '.ads',
            '.advertisement'
          ];
          
          elementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => el && el.remove());
          });
        }
        
        function initGenericReader() {
          window.MangaReader.log('Initializing generic reader...');
          
          // Generic optimizations for unknown manga sites
          const commonElementsToHide = [
            'header:not(.manga-header)',
            'nav:not(.manga-nav)',
            '.header:not(.manga-header)',
            '.navbar:not(.manga-navbar)',
            '.navigation:not(.manga-navigation)',
            '.sidebar:not(.manga-sidebar)',
            '.footer:not(.manga-footer)',
            '.ads',
            '.advertisement',
            '.adsense',
            '.social',
            '.comments:not(.manga-comments)',
            '.popup',
            '.modal:not(.manga-modal)',
            '[class*="ad-"]:not([class*="manga"])',
            '[id*="ad-"]:not([id*="manga"])'
          ];
          
          commonElementsToHide.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el && el.offsetHeight > 0 && !el.closest('.manga-content, .reading-area, #chapter_body')) {
                el.style.display = 'none';
              }
            });
          });
          
          // Try to find and optimize manga images
          const possibleImageSelectors = [
            'img[src*="manga"]',
            'img[src*="chapter"]',
            'img[src*="page"]',
            '.manga-image img',
            '.chapter-image img',
            '.reading-area img',
            '.content img[src*="wp-content"]'
          ];
          
          possibleImageSelectors.forEach(selector => {
            const images = document.querySelectorAll(selector);
            images.forEach(img => {
              if (img.naturalWidth > 200 && img.naturalHeight > 200) {
                img.style.cssText = \`
                  width: 100% !important;
                  height: auto !important;
                  display: block !important;
                  margin: 0 auto 2px auto !important;
                \`;
              }
            });
          });
        }
        
        function extractKomikcastInfo() {
          try {
            const title = document.querySelector('h1.komik_info-content-body-title, .entry-title, h1.title, .manga-title')?.textContent?.trim();
            const thumbnail = document.querySelector('.komik_info-content-thumbnail img, .thumb img, .manga-thumb img')?.src;
            const description = document.querySelector('.komik_info-description-sinopsis, .summary, .manga-summary')?.textContent?.trim();
            const genre = Array.from(document.querySelectorAll('.komik_info-content-genre a, .genre a, .manga-genre a')).map(a => a.textContent.trim());
            const status = document.querySelector('.komik_info-content-info, .status, .manga-status')?.textContent?.trim();
            
            if (title) {
              return {
                title,
                url: window.location.href,
                thumbnail,
                description,
                genre: genre.join(', '),
                status,
                site: window.location.hostname
              };
            }
          } catch (error) {
            window.MangaReader.log('Error extracting manga info: ' + error.message);
          }
          return null;
        }
        
        function addFloatingButtons() {
          // Remove existing FAB if any
          const existingFab = document.getElementById('manga-reader-fab');
          if (existingFab) existingFab.remove();
          
          // Create floating action buttons
          const fabContainer = document.createElement('div');
          fabContainer.id = 'manga-reader-fab';
          fabContainer.style.cssText = \`
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
          \`;
          
          // Bookmark button
          const bookmarkBtn = createFAB('📚', '#007AFF', () => {
            const mangaInfo = window.MangaReader.currentManga || extractKomikcastInfo();
            if (mangaInfo) {
              window.MangaReader.sendMessage({
                type: 'BOOKMARK_ADD',
                ...mangaInfo
              });
            } else {
              window.MangaReader.sendMessage({
                type: 'BOOKMARK_ADD',
                title: document.title,
                url: window.location.href,
                site: window.location.hostname
              });
            }
          });
          
          // Download button (only show on chapter pages)
          if (window.MangaReader.isMangaChapter()) {
            const downloadBtn = createFAB('⬇️', '#34C759', () => {
              const chapterImages = getChapterImages();
              if (chapterImages.length > 0) {
                window.MangaReader.sendMessage({
                  type: 'DOWNLOAD_CHAPTER',
                  chapterTitle: document.title,
                  chapterUrl: window.location.href,
                  images: chapterImages
                });
              } else {
                alert('No images found to download');
              }
            });
            fabContainer.appendChild(downloadBtn);
          }
          
          // Reading mode toggle
          const readingModeBtn = createFAB('👁️', '#FF9500', toggleReadingMode);
          
          // Auto-scroll button (only on chapter pages)
          if (window.MangaReader.isMangaChapter()) {
            const autoScrollBtn = createFAB('⏯️', '#8E44AD', toggleAutoScroll);
            fabContainer.appendChild(autoScrollBtn);
          }
          
          fabContainer.appendChild(bookmarkBtn);
          fabContainer.appendChild(readingModeBtn);
          
          document.body.appendChild(fabContainer);
        }
        
        function createFAB(icon, color, onClick) {
          const btn = document.createElement('button');
          btn.innerHTML = icon;
          btn.style.cssText = \`
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background: \${color};
            color: white;
            border: none;
            font-size: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            transition: transform 0.2s;
          \`;
          
          btn.addEventListener('click', onClick);
          btn.addEventListener('mousedown', () => {
            btn.style.transform = 'scale(0.95)';
          });
          btn.addEventListener('mouseup', () => {
            btn.style.transform = 'scale(1)';
          });
          
          return btn;
        }
        
        function getChapterImages() {
          const imageSelectors = [
            '.main-reading-area img',
            '#chapter_body img',
            '.reading-content img',
            '.entry-content img',
            '.chapter-content img',
            'img[src*="manga"]',
            'img[src*="chapter"]'
          ];
          
          const images = [];
          imageSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(img => {
              if (img.src && img.naturalWidth > 200 && img.naturalHeight > 200) {
                images.push(img.src);
              }
            });
          });
          
          return [...new Set(images)]; // Remove duplicates
        }
        
        function toggleReadingMode() {
          const body = document.body;
          const isReadingMode = body.classList.contains('manga-reading-mode');
          
          if (isReadingMode) {
            body.classList.remove('manga-reading-mode');
            // Restore original styles
            document.querySelectorAll('.manga-hidden').forEach(el => {
              el.style.display = '';
              el.classList.remove('manga-hidden');
            });
          } else {
            body.classList.add('manga-reading-mode');
            // Apply reading mode styles
            body.style.backgroundColor = '#000';
            body.style.color = '#fff';
            
            // Hide all non-essential elements
            const allElements = document.querySelectorAll('*:not(.main-reading-area):not(#chapter_body):not(.reading-content):not(.entry-content)');
            allElements.forEach(el => {
              if (!el.querySelector('img') && 
                  !el.closest('.main-reading-area, #chapter_body, .reading-content, .entry-content, #manga-reader-fab') &&
                  el.offsetHeight > 0) {
                el.style.display = 'none';
                el.classList.add('manga-hidden');
              }
            });
          }
        }
        
        let autoScrollInterval;
        let isAutoScrolling = false;
        
        function toggleAutoScroll() {
          if (isAutoScrolling) {
            clearInterval(autoScrollInterval);
            isAutoScrolling = false;
          } else {
            autoScrollInterval = setInterval(() => {
              window.scrollBy(0, 2);
              if (window.innerHeight + window.scrollY >= document.body.offsetHeight) {
                clearInterval(autoScrollInterval);
                isAutoScrolling = false;
              }
            }, 50);
            isAutoScrolling = true;
          }
        }
        
        function addKeyboardShortcuts() {
          document.addEventListener('keydown', (e) => {
            switch(e.key) {
              case 'r':
              case 'R':
                if (e.ctrlKey || e.metaKey) return;
                toggleReadingMode();
                e.preventDefault();
                break;
              case 'b':
              case 'B':
                if (e.ctrlKey || e.metaKey) return;
                // Trigger bookmark
                const bookmarkBtn = document.querySelector('#manga-reader-fab button');
                if (bookmarkBtn) bookmarkBtn.click();
                e.preventDefault();
                break;
              case 'ArrowLeft':
                // Previous chapter
                const prevBtn = document.querySelector('a[href*="prev"], a[href*="previous"], .prev-chapter, .chapter-prev');
                if (prevBtn) prevBtn.click();
                break;
              case 'ArrowRight':
                // Next chapter
                const nextBtn = document.querySelector('a[href*="next"], .next-chapter, .chapter-next');
                if (nextBtn) nextBtn.click();
                break;
            }
          });
        }
        
        function addAutoScrollFeature() {
          // Add scroll to top button
          const scrollTopBtn = document.createElement('button');
          scrollTopBtn.innerHTML = '⬆️';
          scrollTopBtn.style.cssText = \`
            position: fixed;
            bottom: 20px;
            left: 20px;
            width: 50px;
            height: 50px;
            border-radius: 25px;
            background: #6C757D;
            color: white;
            border: none;
            font-size: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            cursor: pointer;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.3s;
          \`;
          
          scrollTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
          
          // Show/hide scroll to top button
          window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
              scrollTopBtn.style.opacity = '1';
            } else {
              scrollTopBtn.style.opacity = '0';
            }
          });
          
          document.body.appendChild(scrollTopBtn);
        }
        
        function trackReadingProgress() {
          let lastScrollPosition = 0;
          let scrollTimeout;
          let readingStartTime = Date.now();
          
          window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
              const scrollPosition = window.pageYOffset;
              const documentHeight = document.documentElement.scrollHeight;
              const windowHeight = window.innerHeight;
              const scrollPercentage = Math.min(100, (scrollPosition / (documentHeight - windowHeight)) * 100);
              
              // Calculate current page based on images
              const images = document.querySelectorAll('.main-reading-area img, #chapter_body img, .reading-content img');
              let currentPage = 1;
              
              images.forEach((img, index) => {
                const imgTop = img.offsetTop;
                if (scrollPosition >= imgTop - windowHeight / 2) {
                  currentPage = index + 1;
                }
              });
              
              // Send progress update
              window.MangaReader.sendMessage({
                type: 'CHAPTER_PROGRESS',
                mangaUrl: window.MangaReader.currentManga?.url || window.location.href,
                chapterUrl: window.location.href,
                chapterTitle: document.title,
                currentPage: currentPage,
                totalPages: images.length,
                scrollPosition: scrollPosition,
                scrollPercentage: Math.round(scrollPercentage),
                readingTime: Date.now() - readingStartTime,
                timestamp: Date.now()
              });
              
              lastScrollPosition = scrollPosition;
            }, 1000);
          });
          
          // Track when user leaves the page
          window.addEventListener('beforeunload', () => {
            const totalReadingTime = Date.now() - readingStartTime;
            window.MangaReader.sendMessage({
              type: 'CHAPTER_COMPLETE',
              chapterUrl: window.location.href,
              totalReadingTime: totalReadingTime
            });
          });
        }
        
        function optimizeForReading() {
          // Add custom CSS for better reading experience
          const style = document.createElement('style');
          style.textContent = \`
            body.manga-reading-mode {
              background-color: #000 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            
            .main-reading-area img,
            #chapter_body img,
            .reading-content img,
            .entry-content img {
              max-width: 100% !important;
              height: auto !important;
              display: block !important;
              margin: 0 auto 2px auto !important;
              border: none !important;
              box-shadow: none !important;
            }
            
            /* Hide ads and unnecessary elements */
            .ads,
            .advertisement,
            .adsense,
            .google-ads,
            [class*="ad-"]:not([class*="manga"]),
            [id*="ad-"]:not([id*="manga"]),
            iframe[src*="ads"],
            iframe[src*="doubleclick"],
            iframe[src*="googlesyndication"],
            script[src*="ads"],
            script[src*="doubleclick"] {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              height: 0 !important;
              width: 0 !important;
            }
            
            /* Smooth scrolling */
            html {
              scroll-behavior: smooth;
            }
            
            /* Better image loading */
            img {
              image-rendering: -webkit-optimize-contrast;
              image-rendering: crisp-edges;
            }
          \`;
          document.head.appendChild(style);
        }
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initMangaReader);
        } else {
          initMangaReader();
        }
        
        // Also initialize on navigation changes (for SPA sites)
        let lastUrl = location.href;
        new MutationObserver(() => {
          const url = location.href;
          if (url !== lastUrl) {
            lastUrl = url;
            isInitialized = false;
            setTimeout(initMangaReader, 1000);
          }
        }).observe(document, { subtree: true, childList: true });
        
      })();
    `;
  }
  
  static getAdBlockScript() {
    return `
      // Enhanced ad blocking script
      (function() {
        const adSelectors = [
          '.ads',
          '.advertisement',
          '.adsense',
          '.google-ads',
          '.ad-banner',
          '.ad-container',
          '.popup-ad',
          '.floating-ad',
          '.sticky-ad',
          '[class*="ad-"]',
          '[id*="ad-"]',
          'iframe[src*="ads"]',
          'iframe[src*="doubleclick"]',
          'iframe[src*="googlesyndication"]',
          'iframe[src*="googleadservices"]',
          'script[src*="ads"]',
          'script[src*="doubleclick"]',
          'script[src*="googlesyndication"]',
          'div[id^="google_ads"]',
          'div[class^="google-ads"]',
          '.adsbygoogle'
        ];
        
        function removeAds() {
          adSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(el => {
              if (el) {
                el.remove();
              }
            });
          });
          
          // Remove popup overlays
          const popups = document.querySelectorAll('.popup, .modal, .overlay');
          popups.forEach(popup => {
            if (popup.style.display !== 'none' && 
                (popup.textContent.toLowerCase().includes('ad') || 
                 popup.textContent.toLowerCase().includes('subscribe'))) {
              popup.remove();
            }
          });
        }
        
        // Remove ads on load
        removeAds();
        
        // Remove ads periodically
        setInterval(removeAds, 3000);
        
        // Block ad requests
        const originalFetch = window.fetch;
        window.fetch = function(...args) {
          const url = args[0];
          if (typeof url === 'string' && (
            url.includes('doubleclick') ||
            url.includes('googlesyndication') ||
            url.includes('googleadservices') ||
            url.includes('/ads/') ||
            url.includes('adsystem') ||
            url.includes('amazon-adsystem') ||
            url.includes('facebook.com/tr')
          )) {
            return Promise.reject(new Error('Blocked ad request'));
          }
          return originalFetch.apply(this, args);
        };
        
        // Block XMLHttpRequest ads
        const originalXHR = window.XMLHttpRequest.prototype.open;
        window.XMLHttpRequest.prototype.open = function(method, url) {
          if (typeof url === 'string' && (
            url.includes('doubleclick') ||
            url.includes('googlesyndication') ||
            url.includes('googleadservices') ||
            url.includes('/ads/') ||
            url.includes('adsystem')
          )) {
            return;
          }
          return originalXHR.apply(this, arguments);
        };
        
      })();
    `;
  }
  
  static getSiteSpecificScript(hostname) {
    const scripts = {
      'komikcast': this.getKomikcastScript(),
      'komiku': this.getKomikuScript(),
      'mangaku': this.getMangakuScript(),
      'westmanga': this.getWestmangaScript(),
    };
    
    for (const [site, script] of Object.entries(scripts)) {
      if (hostname.includes(site)) {
        return script;
      }
    }
    
    return '';
  }
  
  static getKomikcastScript() {
    return `
      // Komikcast specific optimizations
      (function() {
        // Remove specific Komikcast elements
        const komikcastElementsToHide = [
          '.header-wrapper',
          '.navbar-nav',
          '.sidebar',
          '.footer-wrapper',
          '.social-share',
          '.related-posts',
          '.comments-area',
          '.widget-area'
        ];
        
        komikcastElementsToHide.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el && el.remove());
        });
        
        // Optimize chapter navigation
        const chapterNav = document.querySelector('.chapter-navigation, .nav-chapter');
        if (chapterNav) {
          chapterNav.style.cssText = \`
            position: fixed !important;
            bottom: 0 !important;
            left: 0 !important;
            right: 0 !important;
            background: rgba(0,0,0,0.9) !important;
            z-index: 9998 !important;
            padding: 10px !important;
          \`;
        }
      })();
    `;
  }
  
  static getKomikuScript() {
    return `
      // Komiku specific optimizations
      (function() {
        // Komiku specific code here
        const komikuElements = [
          '.header-top',
          '.header-bottom',
          '.footer-widget',
          '.sidebar-widget'
        ];
        
        komikuElements.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el && el.remove());
        });
      })();
    `;
  }
  
  static getMangakuScript() {
    return `
      // Mangaku specific optimizations
      (function() {
        // Mangaku specific code here
        const mangakuElements = [
          '.top-header',
          '.main-header',
          '.footer-section'
        ];
        
        mangakuElements.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el && el.remove());
        });
      })();
    `;
  }
  
  static getWestmangaScript() {
    return `
      // Westmanga specific optimizations
      (function() {
        // Westmanga specific code here
        const westmangaElements = [
          '.site-header',
          '.site-footer',
          '.widget-area'
        ];
        
        westmangaElements.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => el && el.remove());
        });
      })();
    `;
  }
}

