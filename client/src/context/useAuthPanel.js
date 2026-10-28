import { useContext } from 'react';
import { AuthPanelContext } from './auth-panel-context.js';

export function useAuthPanel() {
  const context = useContext(AuthPanelContext);

  if (!context) {
    throw new Error('useAuthPanel must be used inside AuthPanelProvider.');
  }

  return context;
}
