import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChange,
  requestPasswordReset as requestPasswordResetService,
  restoreSession,
  signIn as signInService,
  signInWithGoogle as signInWithGoogleService,
  signOut as signOutService,
  signUp as signUpService,
  updateEmail as updateEmailService,
  updatePassword as updatePasswordService,
  updateProfile as updateProfileService,
} from '../services/auth';

const AuthContext = createContext(null);

const INITIAL_STATE = {
  user: null,
  status: 'loading',
  error: null,
  authEvent: null,
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
        authEvent: null,
      });
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
      authEvent: null,
    });

    return result;
  }, []);

  useEffect(() => {
    refreshSession();

    return onAuthStateChange((session) => {
      setState({
        user: session.user,
        status: session.status,
        error: session.error || null,
        authEvent: session.event || null,
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
        authEvent: null,
      });
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
      authEvent: null,
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
        authEvent: null,
      });
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
      authEvent: null,
    });

    return result;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setState((current) => ({
      ...current,
      status: 'loading',
      error: null,
    }));

    const result = await signInWithGoogleService();

    if (result.error) {
      setState({
        user: null,
        status: 'anonymous',
        error: result.error,
        authEvent: null,
      });
      return result;
    }

    if (result.data?.status === 'authenticated') {
      setState({
        user: result.data.user,
        status: result.data.status,
        error: null,
        authEvent: null,
      });
    }

    return result;
  }, []);

  const requestPasswordReset = useCallback(async (input) => requestPasswordResetService(input), []);

  const updateProfile = useCallback(async (input) => {
    const result = await updateProfileService(input);

    if (result.error) {
      setState((current) => ({
        ...current,
        status: current.user ? 'authenticated' : 'anonymous',
        error: result.error,
        authEvent: null,
      }));
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
      authEvent: null,
    });

    return result;
  }, []);

  const updateEmail = useCallback(async (input) => {
    const result = await updateEmailService(input);

    if (result.error) {
      setState((current) => ({
        ...current,
        status: current.user ? 'authenticated' : 'anonymous',
        error: result.error,
        authEvent: null,
      }));
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
      authEvent: null,
    });

    return result;
  }, []);

  const updatePassword = useCallback(async (input) => {
    const result = await updatePasswordService(input);

    if (result.error) {
      setState((current) => ({
        ...current,
        status: current.user ? 'authenticated' : 'anonymous',
        error: result.error,
        authEvent: null,
      }));
      return result;
    }

    setState({
      user: result.data.user,
      status: result.data.status,
      error: null,
      authEvent: null,
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
        authEvent: null,
      }));
      return result;
    }

    setState({
      user: null,
      status: 'anonymous',
      error: null,
      authEvent: null,
    });

    return result;
  }, []);

  const value = useMemo(
    () => ({
      user: state.user,
      status: state.status,
      error: state.error,
      authEvent: state.authEvent,
      isAuthenticated: state.status === 'authenticated',
      isLoading: state.status === 'loading',
      requestPasswordReset,
      signIn,
      signInWithGoogle,
      signUp,
      signOut,
      updateEmail,
      updatePassword,
      updateProfile,
      refreshSession,
    }),
    [refreshSession, requestPasswordReset, signIn, signInWithGoogle, signOut, signUp, state.authEvent, state.error, state.status, state.user, updateEmail, updatePassword, updateProfile],
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
