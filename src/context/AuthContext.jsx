import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChange,
  restoreSession,
  signIn as signInService,
  signOut as signOutService,
  signUp as signUpService,
} from '../services/auth';

const AuthContext = createContext(null);

const INITIAL_STATE = {
  user: null,
  status: 'loading',
  error: null,
};

export function AuthProvider({ children }) {
  const [state, setState] = useState(INITIAL_STATE);

  const refreshSession = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    const result = await restoreSession();

    if (result.error) {
      setState({
        user: null,
        status: 'error',
        error: result.error,
      });
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
    });

    return result;
  }, []);

  useEffect(() => {
    refreshSession();

    return onAuthStateChange((session) => {
      setState({
        user: session.user,
        status: session.status,
        error: null,
      });
    });
  }, [refreshSession]);

  const signIn = useCallback(async (input) => {
    setState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    const result = await signInService(input);

    if (result.error) {
      setState({
        user: null,
        status: 'anonymous',
        error: result.error,
      });
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
    });

    return result;
  }, []);

  const signUp = useCallback(async (input) => {
    setState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    const result = await signUpService(input);

    if (result.error) {
      setState({
        user: null,
        status: 'anonymous',
        error: result.error,
      });
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
    });

    return result;
  }, []);

  const signOut = useCallback(async () => {
    const result = await signOutService();

    if (result.error) {
      setState((current) => ({
        ...current,
        status: 'error',
        error: result.error,
      }));
      return result;
    }

    setState({
      user: null,
      status: 'anonymous',
      error: null,
    });

    return result;
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      status: state.status,
      error: state.error,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading',
      signIn,
      signUp,
      signOut,
      refreshSession,
    }),
    [refreshSession, signIn, signOut, signUp, state.error, state.status, state.user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider.');
  }

  return context;
}
