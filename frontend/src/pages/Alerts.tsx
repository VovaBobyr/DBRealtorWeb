import { useAlerts } from '../api/useAlerts'
import { ExternalLink, ArrowRight } from 'lucide-react'

function formatPrice(v: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
}

export default function Alerts() {
  const { data, isLoading, error } = useAlerts({ hours: 24, min_drop_pct: 5 })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-slate-800">Alerts</h1>
        <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />
        <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />
      </div>
    )
  }

  if (error) {
    return <p className="text-red-600">Failed to load alerts: {error.message}</p>
  }

  if (!data) return null

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Alerts</h1>

      {/* New listings */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">
          New listings (last 24h)
          <span className="ml-2 text-sm font-normal text-slate-400">{data.new_listings.length}</span>
        </h2>

        {data.new_listings.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No new listings in the last 24 hours.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Locality</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Price</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Area</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">First seen</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.new_listings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 max-w-64 truncate">{item.title}</td>
                    <td className="px-4 py-3 text-slate-500">{item.locality ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">
                      {item.price_czk != null ? formatPrice(item.price_czk) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.area_m2 != null ? `${item.area_m2} m²` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">{formatDate(item.first_seen_at)}</td>
                    <td className="px-4 py-3 text-center">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Price drops */}
      <section>
        <h2 className="text-base font-semibold text-slate-700 mb-3">
          Price drops ≥5% (last 24h)
          <span className="ml-2 text-sm font-normal text-slate-400">{data.price_drops.length}</span>
        </h2>

        {data.price_drops.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No significant price drops in the last 24 hours.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Locality</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Old price</th>
                  <th className="text-center px-2 py-3"></th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">New price</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">Drop</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.price_drops.map((item) => (
                  <tr key={item.sreality_id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-700 max-w-56 truncate">{item.title}</td>
                    <td className="px-4 py-3 text-slate-500">{item.locality ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-slate-400 line-through">{formatPrice(item.old_price_czk)}</td>
                    <td className="px-2 py-3 text-center text-slate-300"><ArrowRight size={14} /></td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPrice(item.new_price_czk)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
                        −{item.drop_pct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">
                        <ExternalLink size={14} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
