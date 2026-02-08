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

        if (data.version !== CURRENT_VERSION) {
          setNewVersionAvailable(true);
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

  const refreshPage = () => {
    // Force hard reload by clearing cache
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach(name => caches.delete(name));
      });
    }

    // Hard reload with cache busting
    window.location.href = window.location.href.split('?')[0] + '?v=' + Date.now();
  };

  return { newVersionAvailable, refreshPage };
};
