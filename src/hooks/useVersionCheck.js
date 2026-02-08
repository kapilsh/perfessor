import { useEffect, useState } from 'react';

const CURRENT_VERSION = '1.0.1'; // Update this when deploying
const CHECK_INTERVAL = 10 * 1000; // Check every 10 seconds

export const useVersionCheck = () => {
  const [newVersionAvailable, setNewVersionAvailable] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Add timestamp to bypass cache
        const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`);
        const data = await response.json();

        // Check if we just refreshed for this version
        const lastRefreshedVersion = sessionStorage.getItem('lastRefreshedVersion');

        if (data.version !== CURRENT_VERSION) {
          // Don't show banner if we just refreshed for this version
          if (lastRefreshedVersion !== data.version) {
            setNewVersionAvailable(true);
          }
        } else {
          // Versions match, clear the refresh flag
          sessionStorage.removeItem('lastRefreshedVersion');
          setNewVersionAvailable(false);
        }
      } catch (error) {
        console.error('Failed to check version:', error);
      }
    };

    // Check immediately
    checkVersion();

    // Then check periodically
    const interval = setInterval(checkVersion, CHECK_INTERVAL);

    return () => clearInterval(interval);
  }, []);

  const refreshPage = async () => {
    try {
      // Fetch the latest version before refreshing
      const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`);
      const data = await response.json();

      // Store the version we're refreshing for
      sessionStorage.setItem('lastRefreshedVersion', data.version);

      // 1. Unregister all service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(reg => reg.unregister()));
      }

      // 2. Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // 3. Add meta tag to prevent caching
      const meta = document.createElement('meta');
      meta.httpEquiv = 'Cache-Control';
      meta.content = 'no-cache, no-store, must-revalidate';
      document.head.appendChild(meta);

      // 4. Use timeout to ensure all cleanup completes
      setTimeout(() => {
        // Force hard reload with multiple cache-busting techniques
        const url = new URL(window.location.href);
        url.searchParams.set('_', Date.now());
        url.searchParams.set('nocache', '1');

        // Replace location to force full page reload
        window.location.replace(url.toString());
      }, 100);
    } catch (error) {
      console.error('Refresh failed:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  return { newVersionAvailable, refreshPage };
};
