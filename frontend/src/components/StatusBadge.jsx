const STYLES = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-brand-50 text-brand-700 border-brand-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
};

const LABELS = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
};

export default function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STYLES[status] || ''}`}>
      {LABELS[status] || status}
    </span>
  );
}
