import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

/**
 * Which শাখা (branch) the screens are currently looking at.
 *
 * super_admin  — may switch freely, and may pick "সকল শাখা" (activeBranchId
 *                is '' ) to see every branch's books at once.
 * admin / user — permanently pinned to their own branch. RLS enforces this
 *                too, so a tampered client still sees nothing else.
 */
const BranchContext = createContext({});

export const useBranch = () => useContext(BranchContext);

const STORAGE_KEY = 'arms-active-branch';

export const ALL_BRANCHES = '';   // the "সকল শাখা" selection

export const BranchProvider = ({ children }) => {
  const { user, userBranchId, isSuperAdmin } = useAuth();

  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) ?? ALL_BRANCHES;
    } catch {
      return ALL_BRANCHES;
    }
  });

  useEffect(() => {
    if (!user) {
      setBranches([]);
      setLoading(false);
      return;
    }
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function fetchBranches() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('id, name, code, status')
        .order('code', { ascending: true });
      if (error) throw error;
      setBranches(data || []);
    } catch (error) {
      console.error('Error fetching branches:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // A branch user can never be looking at anything but their own branch
  const activeBranchId = isSuperAdmin ? selected : (userBranchId || ALL_BRANCHES);

  function setActiveBranchId(id) {
    if (!isSuperAdmin) return;
    setSelected(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* private window — the choice just will not survive a reload */
    }
  }

  const byId = useMemo(() => {
    const map = {};
    branches.forEach((b) => { map[b.id] = b; });
    return map;
  }, [branches]);

  const activeBranch = activeBranchId ? byId[activeBranchId] || null : null;

  /**
   * Narrow a Supabase query to the branch in view.
   * With "সকল শাখা" selected there is nothing to add — RLS already limits
   * the rows to what this account is allowed to see.
   */
  function scopeQuery(query) {
    return activeBranchId ? query.eq('branch_id', activeBranchId) : query;
  }

  /** Label for a branch id, for rows shown in the "সকল শাখা" view. */
  function branchLabel(id) {
    const b = byId[id];
    if (!b) return '—';
    return `${b.name} (${b.code})`;
  }

  const value = {
    branches,
    activeBranches: branches.filter((b) => b.status === 'active'),
    loading,
    activeBranchId,
    activeBranch,
    setActiveBranchId,
    canSwitchBranch: isSuperAdmin,
    isAllBranches: activeBranchId === ALL_BRANCHES,
    byId,
    scopeQuery,
    branchLabel,
    refreshBranches: fetchBranches,
  };

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
};
