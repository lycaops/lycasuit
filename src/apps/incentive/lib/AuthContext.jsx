'use client';
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import supabase from '@incentive/api/supabaseClient';
import { safeReturnTo } from '@incentive/lib/authReturnTo';

const AuthContext = createContext();
const ADMIN_ROLE_CODES = ['admin', 'HS-ADMIN', 'PM-ADMIN', 'CS-ADMIN', 'COUNTRY-MANAGER', 'UK-ADMIN'];

async function fetchProfile(uid) {
  if (!uid) return null;
  // `profiles` is a view over the unified app_users table and now carries the
  // same role vocabulary and territory columns as FIELD IQ (branches / branch /
  // zone), so a user is allocated exactly the same way in both tools.
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, is_disabled, is_active, branch_id, zone_id, branches, branch, zone, territory, designation, created_at, updated_at')
    .eq('id', uid)
    .maybeSingle();
  let profile = data;

  // Match FIELD IQ's unified-auth fallback for profiles created before the
  // platform started using the Supabase auth user id as the profile id.
  if ((error || !profile) && uid) {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser?.email) {
      const { data: emailMatch, error: emailError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, is_disabled, is_active, branch_id, zone_id, branches, branch, zone, territory, designation, created_at, updated_at')
        .ilike('email', authUser.email)
        .maybeSingle();

      if (!emailError && emailMatch) profile = emailMatch;
    }
  }

  if (!profile) return null;

  // The effective scope (role + branches + zone with display names) is resolved
  // by the database, so the tool and FIELD IQ can never drift apart.
  let scope = null;
  const { data: scopeRows, error: scopeError } = await supabase.rpc('incentive_my_scope');
  if (!scopeError && Array.isArray(scopeRows) && scopeRows.length > 0) scope = scopeRows[0];

  // Fallback for environments where the scope RPC is not deployed yet.
  let branch = null;
  let zone = null;
  if (!scope) {
    if (profile.branch_id) {
      const { data: b } = await supabase
        .from('branches').select('name, code').eq('id', profile.branch_id).maybeSingle();
      branch = b || null;
    }
    if (profile.zone_id) {
      const { data: z } = await supabase
        .from('zones').select('name, code').eq('id', profile.zone_id).maybeSingle();
      zone = z || null;
    }
  }

  const assignedBranches = profile.branches || [];
  const branchNames = scope?.branch_names?.length
    ? scope.branch_names
    : assignedBranches.length > 0
      ? assignedBranches
      : [branch?.name].filter(Boolean);
  const isAdmin = ADMIN_ROLE_CODES.includes(profile.role);

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role,
    is_disabled: profile.is_disabled,
    is_active: profile.is_active,
    is_admin: isAdmin,
    branch_id: profile.branch_id,
    zone_id: profile.zone_id,
    branches: assignedBranches,
    branch: profile.branch || null,
    zone: profile.zone || null,
    branch_names: branchNames,
    branch_name: branchNames.join(', ') || null,
    zone_name: scope?.zone_name || zone?.name || null,
    territory: profile.territory || null,
    designation: profile.designation || null,
    sees_all_retailers: Boolean(scope?.sees_all ?? (isAdmin && assignedBranches.length === 0)),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
  };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings] = useState({ id: 'retailer-incentive-app', public_settings: {} });

  useEffect(() => {
    checkAppState();
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      setAuthError(null);
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setProfile(null);
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
        setAuthChecked(true);
        return;
      }
      setUser(session.user);
      setIsAuthenticated(!!session.user);
      setIsLoadingAuth(true);
      const p = await fetchProfile(session.user.id);
      if (!p) {
        setAuthError({
          type: 'user_not_registered',
          message: 'User not registered for this app. Ask an admin to assign a profile.',
        });
      } else if (p.is_disabled) {
        setAuthError({
          type: 'user_not_registered',
          message: 'Your account has been disabled. Contact the administrator.',
        });
      }
      setProfile(p);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    });
    return () => authListener?.subscription?.unsubscribe();
  }, []);

  const checkAppState = useCallback(async () => {
    try {
      setIsLoadingPublicSettings(true);
      setIsLoadingAuth(true);
      setAuthError(null);

      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const session = sessionData?.session;
      setIsLoadingPublicSettings(false);

      if (!session) {
        setIsLoadingAuth(false);
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }

      setUser(session.user);
      setIsAuthenticated(true);
      const p = await fetchProfile(session.user.id);
      if (!p) {
        setAuthError({
          type: 'user_not_registered',
          message: 'User not registered for this app. Ask an admin to assign a profile.',
        });
      } else if (p.is_disabled) {
        setAuthError({
          type: 'user_not_registered',
          message: 'Your account has been disabled. Contact the administrator.',
        });
      }
      setProfile(p);
      setIsLoadingAuth(false);
      setAuthChecked(true);
    } catch (error) {
      console.error('App state check failed:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'Failed to load app',
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
    }
  }, []);

  const checkUserAuth = useCallback(async () => {
    await checkAppState();
  }, [checkAppState]);

  const signIn = useCallback(async (email, password) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email, password, fullName) => {
    const { error, data } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        emailRedirectTo: window.location.origin + '/login',
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const resendOtp = useCallback(async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
    });
    if (error) throw error;
  }, []);

  const verifyOtp = useCallback(async (email, token) => {
    const { error, data } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });
    if (error) throw error;
    return data;
  }, []);

  const resetPasswordRequest = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) throw error;
  }, []);

  const updateUserPassword = useCallback(async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }, []);

  const logout = useCallback((shouldRedirect = true) => {
    supabase.auth.signOut().then(() => {
      setUser(null);
      setProfile(null);
      setIsAuthenticated(false);
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    });
  }, []);

  const navigateToLogin = useCallback(() => {
    const dest = '/auth/login?returnTo=' + encodeURIComponent('/tools/incentive' + safeReturnTo());
    window.location.href = dest;
  }, []);

  const mergedUser = profile
    ? { ...(user || {}), role: profile.role, profile, email: profile.email || user?.email }
    : user || null;

  return (
    <AuthContext.Provider
      value={{
        user: mergedUser,
        profile,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        signIn,
        signUp,
        resendOtp,
        verifyOtp,
        resetPasswordRequest,
        updateUserPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
