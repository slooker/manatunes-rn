import { useEffect } from 'react';

import { useServerStore } from '@store/useServerStore';

export function useNoServerRedirect(navigation: any) {
  const isLoaded = useServerStore((s) => s.isLoaded);
  const serverCount = useServerStore((s) => s.servers.length);
  const hasNoServers = isLoaded && serverCount === 0;

  const goToServers = () => {
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('Servers');
      return;
    }
    navigation.navigate('Drawer', { screen: 'Servers' });
  };

  useEffect(() => {
    if (hasNoServers) {
      goToServers();
    }
  }, [hasNoServers]);

  return { hasNoServers, isLoaded, goToServers };
}
