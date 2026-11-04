export type NewsSignalType =
  | "expansion"
  | "investment"
  | "partnership"
  | "digital_transformation"
  | "tender"
  | "leadership"
  | "market_move";

export interface NewsletterIndustryOption {
  id: number;
  name: string;
  cached_articles_count: number;
  last_synced_at: string | null;
  sub_industries: Array<{
    id: number;
    name: string;
  }>;
}

export interface NewsletterEntityTag {
  id: number;
  entity_name: string;
  normalized_name: string;
  entity_type: "company" | "brand";
  parent_company_hint: string | null;
  website_hint: string | null;
  role_in_news: "subject" | "partner" | "competitor";
  signal_context: string | null;
  matched_lead_id: number | null;
  matched_lead_name: string | null;
  converted_at: string | null;
}

export interface NewsletterArticle {
  id: number;
  title: string;
  url: string;
  source_name: string | null;
  source_domain: string | null;
  published_at: string | null;
  snippet: string | null;
  signal_type: NewsSignalType;
  relevance_tier: "high" | "medium" | "general";
  search_provider: string;
  sub_industry: {
    id: number;
    name: string;
  } | null;
  entities: NewsletterEntityTag[];
}

export interface NewsletterDirectoryEntity {
  representative_entity_id: number;
  entity_name: string;
  normalized_name: string;
  entity_type: "company" | "brand";
  parent_company_hint: string | null;
  website_hint: string | null;
  mention_count: number;
  latest_signal_type: NewsSignalType;
  latest_headline: string | null;
  latest_article_url: string | null;
  latest_source_name: string | null;
  latest_published_at: string | null;
  signal_context: string | null;
  matched_lead_id: number | null;
  matched_lead_name: string | null;
}

export interface NewsletterSignalStat {
  signal_type: NewsSignalType;
  count: number;
  percentage: number;
}

export interface NewsletterSyncSnapshot {
  id: number;
  status: "queued" | "running" | "completed" | "failed";
  region_scope: "id" | "global";
  articles_fetched: number;
  new_articles_saved: number;
  entities_detected: number;
  providers_used: string[];
  error_message: string | null;
  completed_at: string | null;
  created_at: string | null;
}

export interface NewsletterTelemetry {
  total_articles: number;
  unique_publishers: number;
  unique_entities: number;
  convertible_prospects: number;
  pipeline_mentions: number;
  dominant_signal: NewsletterSignalStat | null;
  signal_breakdown: NewsletterSignalStat[];
  edition_number: number;
  last_sync: NewsletterSyncSnapshot | null;
}

export interface NewsletterIndexResponse {
  success: boolean;
  data: {
    industry: {
      id: number;
      name: string;
    } | null;
    telemetry: NewsletterTelemetry;
    articles: NewsletterArticle[];
    entity_directory: NewsletterDirectoryEntity[];
    meta: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  };
}
