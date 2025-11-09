import { useEffect } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

type InitializableState = {
  initialized: boolean;
  initialize: () => Promise<void>;
};

export function useStoreInitializer<State extends InitializableState>(
  store: UseBoundStore<StoreApi<State>>,
): void {
  useEffect(() => {
    const { initialized, initialize } = store.getState();
    if (!initialized) {
      void initialize().catch((error) => {
        if (__DEV__) {
          console.warn('Store initialization failed', error);
        }
      });
    }
  }, [store]);
}
