import { Link } from 'react-router-dom';
import { MapPin, Star } from 'lucide-react';

export default function VenueCard({ venue }) {
  return (
    <Link
      to={`/canchas/${venue.id}`}
      className="card group overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={venue.imageUrl || 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800'}
          alt={venue.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-block rounded-full bg-brand-50 text-brand-700 text-xs font-semibold px-2.5 py-0.5">
            {venue.sportType}
          </span>
          {venue.avgRating != null && (
            <span className="flex items-center gap-1 text-sm text-slate-600">
              <Star className="size-3.5 fill-amber-400 text-amber-400" />
              {venue.avgRating} <span className="text-slate-400">({venue.reviewCount})</span>
            </span>
          )}
        </div>
        <h3 className="mt-2 font-semibold text-slate-900 text-lg leading-snug">{venue.name}</h3>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="size-3.5 shrink-0" /> {venue.address}
        </p>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-xl font-bold text-slate-900">RD$ {Number(venue.pricePerHour).toLocaleString()}</span>
          <span className="text-sm text-slate-500">/ hora</span>
        </div>
      </div>
    </Link>
  );
}
