import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays } from '../lib/date';

/**
 * Reusable DateField with Previous Day (<) and Next Day (>) buttons.
 */
export function DateField({
  label = 'তারিখ (Date)',
  value,
  onChange,
  max,
  min,
  required = false,
  helperText,
  className = '',
  inputClassName = 'font-semibold text-[#00f2fe]',
}) {
  const canGoPrev = !min || value > min;
  const canGoNext = !max || value < max;

  const handlePrev = () => {
    const nextDate = addDays(value, -1);
    if (!min || nextDate >= min) {
      onChange(nextDate);
    }
  };

  const handleNext = () => {
    const nextDate = addDays(value, 1);
    if (!max || nextDate <= max) {
      onChange(nextDate);
    }
  };

  return (
    <div className={`form-group !mb-0 ${className}`}>
      {label && <label className="form-label">{label}</label>}
      <div className="flex items-stretch gap-1.5">
        <button
          type="button"
          onClick={handlePrev}
          disabled={!canGoPrev}
          title="পূর্ববর্তী দিন (Previous Day)"
          aria-label="Previous day"
          className="px-2.5 md:px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all shrink-0 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <ChevronLeft size={18} />
        </button>
        <input
          type="date"
          className={`form-input flex-1 min-w-0 ${inputClassName}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          max={max}
          min={min}
          required={required}
        />
        <button
          type="button"
          onClick={handleNext}
          disabled={!canGoNext}
          title="পরবর্তী দিন (Next Day)"
          aria-label="Next day"
          className="px-2.5 md:px-3 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white active:scale-95 transition-all shrink-0 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          <ChevronRight size={18} />
        </button>
      </div>
      {helperText && (
        <p className="text-white/45 text-xs mt-1.5">
          {helperText}
        </p>
      )}
    </div>
  );
}
