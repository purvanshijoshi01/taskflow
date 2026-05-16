import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, USE_MOCK } from './supabase';
import { mockSignIn, mockSignUp, mockSignOut, mockGetSession } from './mockData';

const AuthContext = createContext(null);

async function loadProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, email, role')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async (session) => {
    if (!session?.user) {
      setUser(null);
      return null;
    }
    try {
      const profile = await loadProfile(session.user.id);
      setUser(profile);
      return profile;
    } catch (err) {
      console.error('Failed to load profile', err);
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (USE_MOCK) {
      mockGetSession().then((profile) => {
        if (!mounted) return;
        setUser(profile);
        setLoading(false);
      });
      return () => { mounted = false; };
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      await refreshUser(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      await refreshUser(session);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [refreshUser]);

  const login = async (email, password) => {
    if (USE_MOCK) {
      const profile = await mockSignIn(email, password);
      setUser(profile);
      return profile;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email?.toLowerCase().trim(),
      password,
    });
    if (error) throw error;
    return refreshUser(data.session);
  };

  const signup = async (name, email, password) => {
    if (USE_MOCK) {
      const profile = await mockSignUp(name, email, password);
      setUser(profile);
      return profile;
    }
    const trimmedName = name?.trim();
    const normalizedEmail = email?.toLowerCase().trim();
    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: { data: { name: trimmedName } },
    });
    if (error) throw error;
    if (data.session) {
      return refreshUser(data.session);
    }
    return null;
  };

  const logout = async () => {
    if (USE_MOCK) {
      await mockSignOut();
      setUser(null);
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
