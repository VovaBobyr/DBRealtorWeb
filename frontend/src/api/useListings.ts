import { useQuery } from '@tanstack/react-query'
import type { ListingsPage } from './types'

export interface ListingsParams {
  page: number
  limit: number
  locality?: string
  property_type?: string
  listing_type?: string
  sort_by?: string
  order?: 'asc' | 'desc'
}

async function fetchListings(params: ListingsParams): Promise<ListingsPage> {
  const qs = new URLSearchParams({ page: String(params.page), limit: String(params.limit) })
  if (params.locality) qs.set('locality', params.locality)
  if (params.property_type) qs.set('property_type', params.property_type)
  if (params.listing_type) qs.set('listing_type', params.listing_type)
  if (params.sort_by) qs.set('sort_by', params.sort_by)
  if (params.order) qs.set('order', params.order)
  const res = await fetch(`/api/listings?${qs}`)
  if (!res.ok) throw new Error(`Listings fetch failed: ${res.status}`)
  return res.json() as Promise<ListingsPage>
}

export function useListings(params: ListingsParams) {
  return useQuery<ListingsPage, Error>({
    queryKey: ['listings', params],
    queryFn: () => fetchListings(params),
    placeholderData: (prev) => prev,
  })
}
