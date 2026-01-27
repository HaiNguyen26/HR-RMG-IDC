import { useEffect, useState } from 'react';

const getInitialVisibility = () => {
  if (typeof document === 'undefined') return true;
  return document.visibilityState === 'visible';
};

const usePageVisibility = () => {
  const [isVisible, setIsVisible] = useState(getInitialVisibility);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return isVisible;
};

export default usePageVisibility;
