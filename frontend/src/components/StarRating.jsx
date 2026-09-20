import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, size = 18, readOnly = false }) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-0.5">
      {stars.map((n) => (
        <button
          key={n}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(n)}
          aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
          aria-pressed={n <= value}
          className={readOnly ? 'cursor-default' : 'cursor-pointer'}
        >
          <Star
            size={size}
            className={n <= value ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}
          />
        </button>
      ))}
    </div>
  );
}
