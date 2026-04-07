// Shared API response types mirroring backend Pydantic models

export interface LastScrapeRun {
  status: string
  started_at: string
  finished_at: string | null
  listings_found: number
}

export interface DashboardSummary {
  total_listings: number
  new_today: number
  avg_price_czk: number | null
  last_scrape_run: LastScrapeRun | null
}

export interface PriceTrendPoint {
  month: string
  avg_price_czk: number
  avg_price_per_m2: number | null
  count: number
}

export interface ListingItem {
  id: string
  sreality_id: string
  listing_type: string
  property_type: string
  title: string
  price_czk: number | null
  area_m2: number | null
  price_per_m2: number | null
  locality: string | null
  first_seen_at: string
  last_seen_at: string
  url: string
}

export interface ListingsPage {
  items: ListingItem[]
  total: number
  page: number
  pages: number
}

export interface NewListingItem {
  id: string
  sreality_id: string
  title: string
  locality: string | null
  property_type: string
  listing_type: string
  price_czk: number | null
  area_m2: number | null
  first_seen_at: string
  url: string
}

export interface PriceDropItem {
  sreality_id: string
  title: string
  locality: string | null
  url: string
  old_price_czk: number
  new_price_czk: number
  drop_pct: number
}

export interface AlertsResponse {
  new_listings: NewListingItem[]
  price_drops: PriceDropItem[]
}
