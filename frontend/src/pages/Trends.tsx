import { useState } from 'react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTrends } from '../api/useTrends'
import { useNewPerDay } from '../api/useNewPerDay'

const LOCALITIES = ['Praha', 'Brno', 'Ostrava', 'Plzeň', 'Liberec']
const PROPERTY_TYPES = ['flat', 'house', 'land', 'commercial']
const MONTHS_OPTIONS = [3, 6, 12, 24]

function formatCZK(val: number): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(val)
}

interface TooltipEntry { value?: number }
interface NewPerDayTooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

function NewPerDayTooltip({ active, payload, label }: NewPerDayTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm">
      <span className="text-slate-700">
        Date: {String(label)} — <strong>{payload[0].value}</strong> new listings
      </span>
    </div>
  )
}

export default function Trends() {
  const [locality, setLocality] = useState('Praha')
  const [propertyType, setPropertyType] = useState('flat')
  const [months, setMonths] = useState(12)

  const { data, isLoading, error } = useTrends({ locality, property_type: propertyType, months })
  const { data: newPerDay, isLoading: newPerDayLoading, error: newPerDayError } =
    useNewPerDay({ locality, property_type: propertyType, months })

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Trends</h1>

      {/* Shared controls — both charts respond to these */}
      <div className="flex flex-wrap gap-4">
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

      {/* Chart 1 — avg price */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700 mb-4">Avg price</h2>

        {isLoading && <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />}
        {error && <p className="text-red-600 text-sm">Failed to load trends: {error.message}</p>}

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
                  formatter={(value, name) => [
                    typeof value === 'number' ? formatCZK(value) : value,
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

      {/* Chart 2 — new listings per day */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-700 mb-4">New listings per day</h2>

        {newPerDayLoading && <div className="h-56 bg-slate-100 rounded-lg animate-pulse" />}
        {newPerDayError && (
          <p className="text-red-600 text-sm">Failed to load new listings: {newPerDayError.message}</p>
        )}

        {newPerDay && !newPerDayLoading && (
          newPerDay.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-12">No data for this combination.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={newPerDay} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  interval={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#94a3b8' }}
                  width={40}
                />
                <Tooltip content={<NewPerDayTooltip />} />
                <Bar dataKey="count" fill="#0ea5e9" radius={[3, 3, 0, 0]} name="New listings" />
              </BarChart>
            </ResponsiveContainer>
          )
        )}
      </div>
    </div>
  )
}
