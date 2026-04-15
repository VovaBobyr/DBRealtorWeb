import { useQuery } from '@tanstack/react-query'
import type { NewListingsDayPoint } from './types'

async function fetchNewListingsTrend(days: number): Promise<NewListingsDayPoint[]> {
  const res = await fetch(`/api/trends/new-listings?days=${days}`)
  if (!res.ok) throw new Error(`New listings trend fetch failed: ${res.status}`)
  return res.json() as Promise<NewListingsDayPoint[]>
}

export function useNewListingsTrend(days: number) {
  return useQuery<NewListingsDayPoint[], Error>({
    queryKey: ['trends', 'new-listings', days],
    queryFn: () => fetchNewListingsTrend(days),
    staleTime: 5 * 60_000,
  })
}
