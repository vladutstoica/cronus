import React, { createContext, ReactNode, useContext, useState } from "react";
import type { MainSection } from "../components/MainViewSidebar";

interface NavigationContextType {
  activeSection: MainSection;
  setActiveSection: (section: MainSection) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(
  undefined,
);

export const NavigationProvider = ({
  children,
}: {
  children: ReactNode;
}): React.ReactElement => {
  const [activeSection, setActiveSection] = useState<MainSection>("dashboard");

  return (
    <NavigationContext.Provider value={{ activeSection, setActiveSection }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = (): NavigationContextType => {
  const context = useContext(NavigationContext);
  if (context === undefined) {
    throw new Error("useNavigation must be used within a NavigationProvider");
  }
  return context;
};
