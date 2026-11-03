import { useCallback, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth.js';
import { AuthPanelContext } from './auth-panel-context.js';

const DEFAULT_REASON = 'Sign in or create an account to continue.';

// Lets any screen ask for a signed-in customer without leaving the page:
//
//   requireAuth(() => navigate('/checkout'), { reason, onCancel })
//
// If the customer is already signed in (with a saved profile) the action runs
// immediately. Otherwise a floating sign-in / registration panel opens; the action
// runs once they finish, and `onCancel` runs if they close the panel instead.
export default function AuthPanelProvider({ children }) {
  const { user, profile } = useAuth();
  const [state, setState] = useState({ open: false, reason: DEFAULT_REASON });
  const pending = useRef(null);

  const requireAuth = useCallback(
    (action, options = {}) => {
      if (user && profile) {
        action?.();
        return true;
      }

      pending.current = { action, onCancel: options.onCancel };
      setState({ open: true, reason: options.reason ?? DEFAULT_REASON });
      return false;
    },
    [user, profile],
  );

  const closeAuthPanel = useCallback(() => {
    const request = pending.current;
    pending.current = null;
    setState((current) => ({ ...current, open: false }));
    request?.onCancel?.();
  }, []);

  const completeAuthPanel = useCallback(() => {
    const request = pending.current;
    pending.current = null;
    setState((current) => ({ ...current, open: false }));
    request?.action?.();
  }, []);

  const value = useMemo(
    () => ({
      open: state.open,
      reason: state.reason,
      requireAuth,
      closeAuthPanel,
      completeAuthPanel,
    }),
    [state, requireAuth, closeAuthPanel, completeAuthPanel],
  );

  return <AuthPanelContext.Provider value={value}>{children}</AuthPanelContext.Provider>;
}
