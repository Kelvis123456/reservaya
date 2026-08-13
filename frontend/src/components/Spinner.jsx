import { Loader2 } from 'lucide-react';

export default function Spinner({ className = '' }) {
  return (
    <div className={`flex justify-center items-center py-12 ${className}`}>
      <Loader2 className="size-6 animate-spin text-brand-600" />
    </div>
  );
}
