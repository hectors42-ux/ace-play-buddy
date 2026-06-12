import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import {
  CelebrationOverlay,
  type CelebrationProps,
} from '@/components/feedback/CelebrationOverlay';

type CelebrateFn = (props: Omit<CelebrationProps, 'onClose'>) => void;

const CelebrateCtx = createContext<CelebrateFn>(() => {});

export function CelebrateProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<CelebrationProps | null>(null);

  const celebrate = useCallback<CelebrateFn>((props) => {
    setActive({ ...props, onClose: () => setActive(null) });
  }, []);

  return (
    <CelebrateCtx.Provider value={celebrate}>
      {children}
      {active && <CelebrationOverlay {...active} />}
    </CelebrateCtx.Provider>
  );
}

export function useCelebrate() {
  return useContext(CelebrateCtx);
}