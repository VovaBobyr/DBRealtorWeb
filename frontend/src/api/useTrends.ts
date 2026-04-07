import { useQuery } from '@tanstack/react-query'
import type { PriceTrendPoint } from './types'

interface TrendsParams {
  locality: string
  property_type: string
  months: number
}

async function fetchTrends(params: TrendsParams): Promise<PriceTrendPoint[]> {
  const qs = new URLSearchParams({
    locality: params.locality,
    property_type: params.property_type,
    months: String(params.months),
  })
  const res = await fetch(`/api/trends/price?${qs}`)
  if (!res.ok) throw new Error(`Trends fetch failed: ${res.status}`)
  return res.json() as Promise<PriceTrendPoint[]>
}

export function useTrends(params: TrendsParams) {
  return useQuery<PriceTrendPoint[], Error>({
    queryKey: ['trends', params],
    queryFn: () => fetchTrends(params),
    staleTime: 5 * 60_000,
  })
}
