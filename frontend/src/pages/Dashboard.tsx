import { useDashboard } from '../api/useDashboard'
import { CheckCircle, XCircle, Home, Clock, TrendingUp, Plus } from 'lucide-react'

function formatPrice(czk: number | null): string {
  if (czk == null) return '—'
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(czk)
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso))
}

interface CardProps {
  title: string
  value: string
  sub?: string
  icon: React.ReactNode
  accent?: string
}

function SummaryCard({ title, value, sub, icon, accent = 'bg-blue-50 text-blue-600' }: CardProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className={`rounded-lg p-2.5 ${accent}`}>{icon}</div>
      <div>
        <p className="text-sm text-slate-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { data, isLoading, error } = useDashboard()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-slate-200 h-28 animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-red-600">Failed to load dashboard: {error.message}</p>
  }

  if (!data) return null

  const run = data.last_scrape_run
  const runOk = run?.status === 'success'

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-800">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="Active listings"
          value={data.total_listings.toLocaleString()}
          icon={<Home size={20} />}
          accent="bg-blue-50 text-blue-600"
        />
        <SummaryCard
          title="New today"
          value={data.new_today.toLocaleString()}
          icon={<Plus size={20} />}
          accent="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          title="Avg price Praha"
          value={formatPrice(data.avg_price_czk)}
          sub="Active listings"
          icon={<TrendingUp size={20} />}
          accent="bg-violet-50 text-violet-600"
        />
        <div className={`bg-white rounded-xl border p-5 flex items-start gap-4 shadow-sm ${runOk ? 'border-emerald-200' : run ? 'border-red-200' : 'border-slate-200'}`}>
          <div className={`rounded-lg p-2.5 ${runOk ? 'bg-emerald-50 text-emerald-600' : run ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-400'}`}>
            {runOk ? <CheckCircle size={20} /> : run ? <XCircle size={20} /> : <Clock size={20} />}
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Last scrape</p>
            {run ? (
              <>
                <p className={`text-2xl font-bold mt-0.5 capitalize ${runOk ? 'text-emerald-700' : 'text-red-700'}`}>
                  {run.status}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {formatDateTime(run.started_at)} · {run.listings_found.toLocaleString()} found
                </p>
              </>
            ) : (
              <p className="text-2xl font-bold text-slate-400 mt-0.5">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
