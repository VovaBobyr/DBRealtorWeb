import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTrends } from '../api/useTrends'

const LOCALITIES = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec']
const PROPERTY_TYPES = ['flat', 'house', 'land', 'commercial']
const MONTHS_OPTIONS = [3, 6, 12, 24]

function formatCZK(val: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val)
}

export default function Trends() {
  const [locality, setLocality] = useState('Praha')
  const [propertyType, setPropertyType] = useState('flat')
  const [months, setMonths] = useState(12)

  const { data, isLoading, error } = useTrends({ locality, property_type: propertyType, months })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Price Trends</h1>

      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-wrap gap-4 mb-6">
          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Locality</label>
            <select
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {LOCALITIES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">Property type</label>
            <select
              value={propertyType}
              onChange={(e) => setPropertyType(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-500 font-medium mb-1">
              Period: <span className="text-slate-800 font-semibold">{months} months</span>
            </label>
            <input
              type="range"
              min={3}
              max={24}
              step={3}
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-36 accent-blue-500"
            />
            <div className="flex justify-between text-xs text-slate-400 w-36">
              {MONTHS_OPTIONS.map((m) => <span key={m}>{m}</span>)}
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
        )}

        {error && (
          <p className="text-red-600 text-sm">Failed to load trends: {error.message}</p>
        )}

        {data && !isLoading && (
          data.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">No data for this combination.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <YAxis
                  yAxisId="price"
                  tickFormatter={(v: number) => `${(v / 1_000_000).toFixed(1)}M`}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  width={60}
                />
                <YAxis
                  yAxisId="perm2"
                  orientation="right"
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  width={55}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCZK(value),
                    name === 'avg_price_czk' ? 'Avg price' : 'Avg price/m²',
                  ]}
                />
                <Legend formatter={(v) => (v === 'avg_price_czk' ? 'Avg price' : 'Avg price/m²')} />
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="avg_price_czk"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  yAxisId="perm2"
                  type="monotone"
                  dataKey="avg_price_per_m2"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )
        )}
      </div>
    </div>
  )
}
