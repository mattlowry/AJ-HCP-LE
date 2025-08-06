import React, { createContext, useContext, useState, ReactNode } from 'react';

interface SidebarConfig {
  show: boolean;
  title?: string;
  content?: ReactNode;
  width?: number;
}

interface NavigationContextType {
  sidebar: SidebarConfig;
  setSidebar: (config: Partial<SidebarConfig>) => void;
  showSidebar: (title?: string, content?: ReactNode, width?: number) => void;
  hideSidebar: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

interface NavigationProviderProps {
  children: ReactNode;
}

export const NavigationProvider: React.FC<NavigationProviderProps> = ({ children }) => {
  const [sidebar, setSidebarState] = useState<SidebarConfig>({
    show: false,
    width: 300,
  });

  const setSidebar = (config: Partial<SidebarConfig>) => {
    setSidebarState(prev => ({ ...prev, ...config }));
  };

  const showSidebar = (title?: string, content?: ReactNode, width: number = 300) => {
    setSidebarState({
      show: true,
      title,
      content,
      width,
    });
  };

  const hideSidebar = () => {
    setSidebarState(prev => ({
      ...prev,
      show: false,
    }));
  };

  const value: NavigationContextType = {
    sidebar,
    setSidebar,
    showSidebar,
    hideSidebar,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};

export default NavigationContext;