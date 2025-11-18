import React, { createContext, ReactNode, useContext, useState } from "react";

interface SettingsContextType {
  isSettingsOpen: boolean;
  setIsSettingsOpen: (isOpen: boolean) => void;
  focusOn: string | null;
  setFocusOn: (element: string | null) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined,
);

export const SettingsProvider = ({
  children,
}: {
  children: ReactNode;
}): React.ReactElement => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [focusOn, setFocusOn] = useState<string | null>(null);

  return (
    <SettingsContext.Provider
      value={{ isSettingsOpen, setIsSettingsOpen, focusOn, setFocusOn }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
