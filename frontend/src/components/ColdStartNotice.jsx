import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { onSlowRequests } from '../services/api';

/** Franja que aparece si el servidor tarda: en el plan gratis puede estar despertando. */
export default function ColdStartNotice() {
  const [slow, setSlow] = useState(false);
  useEffect(() => onSlowRequests(setSlow), []);
  if (!slow) return null;
  return (
    <div role="status" className="sticky top-16 z-20 flex items-center justify-center gap-2 bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800">
      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
      Despertando el servidor… la primera carga puede tardar hasta un minuto.
    </div>
  );
}
