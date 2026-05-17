import { createContext, useContext, type ReactNode } from 'react';

interface OrgContextType {
  org: null;
  orgLoading: boolean;
  isSuperuser: boolean;
  isOrgAdmin: boolean;
  refetchOrg: () => void;
}

const OrgContext = createContext<OrgContextType>({
  org: null,
  orgLoading: false,
  isSuperuser: false,
  isOrgAdmin: false,
  refetchOrg: () => {},
});

export function OrgProvider({ children }: { children: ReactNode }) {
  return (
    <OrgContext.Provider value={{
      org: null,
      orgLoading: false,
      isSuperuser: false,
      isOrgAdmin: false,
      refetchOrg: () => {},
    }}>
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  return useContext(OrgContext);
}
