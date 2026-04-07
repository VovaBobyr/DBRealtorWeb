import { useState, useEffect, useCallback } from 'react'
import { useListings } from '../api/useListings'
import type { ListingsParams } from '../api/useListings'
import { ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

type SortField = 'price_czk' | 'area_m2' | 'first_seen_at' | 'price_per_m2'
type SortOrder = 'asc' | 'desc'

function formatPrice(v: number | null): string {
  if (v == null) return '—'
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v)
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'short' }).format(new Date(iso))
}

function SortIcon({ active, order }: { active: boolean; order: SortOrder }) {
  if (!active) return <ChevronsUpDown size={13} className="text-slate-400" />
  return order === 'asc'
    ? <ChevronUp size={13} className="text-blue-500" />
    : <ChevronDown size={13} className="text-blue-500" />
}

const COLUMNS: { key: SortField; label: string }[] = [
  { key: 'first_seen_at', label: 'First seen' },
  { key: 'price_czk', label: 'Price' },
  { key: 'area_m2', label: 'Area' },
  { key: 'price_per_m2', label: 'Price/m²' },
]

export default function Listings() {
  const [page, setPage] = useState(1)
  const [locality, setLocality] = useState('')
  const [debouncedLocality, setDebouncedLocality] = useState('')
  const [sortBy, setSortBy] = useState<SortField>('first_seen_at')
  const [order, setOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedLocality(locality)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [locality])

  const params: ListingsParams = {
    page,
    limit: 20,
    locality: debouncedLocality || undefined,
    sort_by: sortBy,
    order,
  }

  const { data, isLoading, isFetching } = useListings(params)

  const handleSort = useCallback((field: SortField) => {
    if (field === sortBy) {
      setOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setOrder('desc')
    }
    setPage(1)
  }, [sortBy])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Listings</h1>
        {data && (
          <span className="text-sm text-slate-500">{data.total.toLocaleString()} listings</span>
        )}
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search locality…"
          value={locality}
          onChange={(e) => setLocality(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-56 focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className={`transition-opacity ${isFetching ? 'opacity-60' : 'opacity-100'}`}>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Locality</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Type</th>
                {COLUMNS.map(({ key, label }) => (
                  <th
                    key={key}
                    className="text-right px-4 py-3 font-medium text-slate-500 cursor-pointer select-none hover:text-slate-800"
                    onClick={() => handleSort(key)}
                  >
                    <span className="inline-flex items-center gap-1">
                      {label}
                      <SortIcon active={sortBy === key} order={order} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading
                ? [...Array(10)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-700 max-w-48 truncate">{item.locality ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          <span className="capitalize text-slate-600">{item.property_type}</span>
                          <span className="text-slate-400 text-xs">·</span>
                          <span className="capitalize text-slate-400 text-xs">{item.listing_type}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">{formatPrice(item.price_czk)}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{item.area_m2 != null ? `${item.area_m2} m²` : '—'}</td>
                      <td className="px-4 py-3 text-right text-slate-600">{formatPrice(item.price_per_m2)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">{formatDate(item.first_seen_at)}</td>
                      <td className="px-4 py-3 text-center">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                          title="Open on sreality.cz"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {data && data.pages > 1 && (
          <div className="border-t border-slate-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="text-sm text-slate-500">
              Page {data.page} of {data.pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
              disabled={page === data.pages}
              className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
