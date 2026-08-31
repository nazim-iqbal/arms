import { useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useBranch } from '../contexts/BranchContext';

/**
 * "এটি কোন শাখার জন্য?" — the branch picker every entry form carries.
 *
 * super_admin  : a real dropdown, defaulting to the branch in the header.
 *                With "সকল শাখা" in the header there is no sensible default,
 *                so the field starts empty and the form cannot be submitted
 *                until a branch is chosen.
 * admin / user : their own branch, shown but locked. RLS rejects anything
 *                else anyway, so this is a label rather than a restriction.
 */
export function BranchField({ value, onChange, label = 'কোন শাখার জন্য? (Branch)' }) {
  const { activeBranches, activeBranchId, canSwitchBranch, byId } = useBranch();

  // Follow the header switcher unless the user has already picked something
  useEffect(() => {
    if (!value && activeBranchId) onChange(activeBranchId);
    if (!canSwitchBranch && activeBranchId && value !== activeBranchId) onChange(activeBranchId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, canSwitchBranch]);

  if (!canSwitchBranch) {
    const b = byId[value || activeBranchId];
    return (
      <div className="form-group !mb-0">
        <label className="form-label">{label}</label>
        <div className="relative">
          <input
            type="text"
            className="form-input pl-11 bg-white/5 text-violet-300 font-semibold cursor-not-allowed"
            value={b ? `${b.name} (${b.code})` : ''}
            readOnly
            placeholder="আপনার শাখা নির্ধারিত নয়"
          />
          <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/60 pointer-events-none" />
        </div>
      </div>
    );
  }

  return (
    <div className="form-group !mb-0">
      <label className="form-label">{label}</label>
      <div className="relative">
        <select
          className={`form-input pl-11 font-semibold ${value ? 'text-violet-200 border-violet-500/40' : 'text-white/60'}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          required
        >
          <option value="">-- শাখা নির্বাচন করুন --</option>
          {activeBranches.map((b) => (
            <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
          ))}
        </select>
        <Building2 size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-violet-400/60 pointer-events-none" />
      </div>
    </div>
  );
}

/**
 * Small branch badge for list rows. Only worth showing while more than one
 * branch is in view — inside a single branch every row has the same tag.
 */
export function BranchTag({ branchId, className = '' }) {
  const { byId, isAllBranches } = useBranch();
  if (!isAllBranches) return null;

  const b = byId[branchId];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full
      bg-violet-500/15 text-violet-300 border border-violet-500/30 shrink-0 ${className}`}>
      <Building2 size={9} />{b ? b.code : '—'}
    </span>
  );
}
