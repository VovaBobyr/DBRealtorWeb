import { useQuery } from '@tanstack/react-query'
import type { AlertsResponse } from './types'

interface AlertsParams {
  hours?: number
  min_drop_pct?: number
}

async function fetchAlerts(params: AlertsParams): Promise<AlertsResponse> {
  const qs = new URLSearchParams()
  if (params.hours != null) qs.set('hours', String(params.hours))
  if (params.min_drop_pct != null) qs.set('min_drop_pct', String(params.min_drop_pct))
  const res = await fetch(`/api/alerts?${qs}`)
  if (!res.ok) throw new Error(`Alerts fetch failed: ${res.status}`)
  return res.json() as Promise<AlertsResponse>
}

export function useAlerts(params: AlertsParams = {}) {
  return useQuery<AlertsResponse, Error>({
    queryKey: ['alerts', params],
    queryFn: () => fetchAlerts(params),
    refetchInterval: 5 * 60_000,
  })
}
