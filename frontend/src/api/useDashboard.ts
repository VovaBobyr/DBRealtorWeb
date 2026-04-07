import { useQuery } from '@tanstack/react-query'
import type { DashboardSummary } from './types'

async function fetchDashboard(): Promise<DashboardSummary> {
  const res = await fetch('/api/dashboard/summary')
  if (!res.ok) throw new Error(`Dashboard fetch failed: ${res.status}`)
  return res.json() as Promise<DashboardSummary>
}

export function useDashboard() {
  return useQuery<DashboardSummary, Error>({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    refetchInterval: 60_000,
  })
}
