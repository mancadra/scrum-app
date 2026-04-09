import { useState, useEffect } from 'react';
import { getCurrentUser } from '../services/auth';

const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const data = await getCurrentUser();
      setUser(data);
    } catch (err) {
      console.error("Auth error:", err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  // Preverjanje vlog na podlagi tvojega auth.js (profile.UserRoles)
  const isAdmin = user?.profile?.UserRoles?.some(
    ur => ur.Roles?.name === 'Admin'
  ) ?? false;

  const isDeveloper = user?.profile?.UserRoles?.some(
    ur => ur.Roles?.name === 'Developer'
  ) ?? false;

  // Izvozimo objekte, ki jih TOBEDELETEDTaskCard in App potrebujejo
  return {
    user,
    isAdmin,
    isDeveloper,
    loading,
    refreshUser: fetchUser
  };
};

export default useAuth;