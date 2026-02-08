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

      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }

      // Force hard reload by replacing location (bypasses cache)
      window.location.replace(window.location.href.split('?')[0] + '?nocache=' + Date.now());
    } catch (error) {
      console.error('Refresh failed:', error);
      // Fallback to simple reload
      window.location.reload();
    }
  };

  return { newVersionAvailable, refreshPage };
};
