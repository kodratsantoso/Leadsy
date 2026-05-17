import { useState, useCallback } from "react";
import { apiFetch } from "../apiFetch";

export type GeocodeResult = {
  place_id: string;
  formatted_address: string;
  lat: number;
  lng: number;
  viewport?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
};

export type FitLevel = "high" | "medium" | "low" | "unknown";

export type GeoProductFitAnalysis = {
  id: number;
  place_id: string;
  product_id: number;
  lead_id: number | null;
  fit_score: number;
  fit_level: FitLevel;
  confidence_score: number;
  reasoning: string[];
  matched_signals: string[];
  missing_information: string[];
  risk_flags: string[];
  recommended_approach: string | null;
  recommended_next_action: string | null;
  potential_use_case: string | null;
  pre_fit_score: number;
  analyzed_with_ai: boolean;
  ai_provider_used: string | null;
  ai_model_used: string | null;
  analyzed_at: string | null;
};

export type DiscoveredLead = {
  id: number;
  external_place_id?: string;
  company_name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  email?: string;
  website?: string;
  operating_hours?: string;
  industry?: string;
  business_category?: string;
  rating?: number;
  google_maps_url?: string;
  lead_score?: number;
  qualification_status?: string;
  duplicate_status?: string;
  ai_explanation?: string;
  dedup?: {
    is_duplicate: boolean;
    status: string;
    recommendation: string;
  };
  // Product-fit analysis (populated after analyzeProductFit)
  fit_analysis?: GeoProductFitAnalysis;
};

export type ProductOption = {
  id: number;
  name: string;
  category: string | null;
  status: string;
};

export function useMapDiscovery() {
  const [isSearching, setIsSearching] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const geocodeArea = useCallback(async (query: string): Promise<GeocodeResult | null> => {
    try {
      setIsSearching(true);
      setError(null);
      const res = await apiFetch(`/maps/geocode?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to geocode area");
        return null;
      }
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return null;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const searchPlaces = useCallback(async (
    lat: number,
    lng: number,
    radius: number,
    keyword: string,
    category: string,
    searchMode: "nearby" | "text",
    areaName?: string,
    areaPlaceId?: string,
    limit: number = 50,
  ): Promise<DiscoveredLead[]> => {
    try {
      setIsSearching(true);
      setError(null);

      const queryParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        search_mode: searchMode,
        limit: String(Math.min(limit, 50)),
      });

      if (keyword) queryParams.set("keyword", keyword);
      if (category) queryParams.set("category", category);
      if (areaName) queryParams.set("area_name", areaName);
      if (areaPlaceId) queryParams.set("area_place_id", areaPlaceId);

      const res = await apiFetch(`/maps/search?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return [];
      }

      return data.data || [];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return [];
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getPlaceDetails = useCallback(async (placeId: string): Promise<DiscoveredLead | null> => {
    try {
      setError(null);
      const res = await apiFetch(`/maps/place-details/${placeId}`);
      const data = await res.json();
      if (!res.ok) return null;
      return data.data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return null;
    }
  }, []);

  /**
   * Analyze a batch of discovered places against a product.
   * Returns analysis records keyed by place_id.
   */
  const analyzeProductFit = useCallback(async (
    places: DiscoveredLead[],
    productId: number,
    aiLimit: number = 3,
  ): Promise<Record<string, GeoProductFitAnalysis>> => {
    try {
      setIsAnalyzing(true);
      setError(null);

      const res = await apiFetch("/maps/geo-product-fit/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id: productId,
          places: places.map((p) => ({
            external_place_id: p.external_place_id,
            company_name: p.company_name,
            address: p.address,
            business_category: p.business_category,
            phone: p.phone,
            website: p.website,
            rating: p.rating,
          })),
          ai_limit: aiLimit,
        }),
      });

      const contentType = res.headers.get("content-type");
      const data = contentType?.includes("application/json") ? await res.json() : null;

      if (!res.ok) {
        setError(data?.message || data?.error || "Product-fit analysis could not finish. Please try again with fewer results.");
        return {};
      }

      // Index by place_id
      const indexed: Record<string, GeoProductFitAnalysis> = {};
      for (const item of (data?.data as GeoProductFitAnalysis[] | undefined) ?? []) {
        indexed[item.place_id] = item;
      }
      return indexed;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      return {};
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const addToLeads = useCallback(async (
    place: DiscoveredLead,
    aiMode: "full_ai" | "hybrid" | "manual",
    productId?: number,
  ) => {
    try {
      setIsSearching(true);
      const res = await apiFetch("/maps/add-to-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          external_place_id: place.external_place_id,
          company_name: place.company_name,
          address: place.address,
          lat: place.lat,
          lng: place.lng,
          phone: place.phone,
          website: place.website,
          business_category: place.business_category,
          ai_mode: aiMode,
          // Product-fit context
          product_id: productId ?? null,
          fit_analysis_id: place.fit_analysis?.id ?? null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to add lead");
      }
      return { data: data.data, ai_warning: data.ai_warning ?? null };
    } catch (err) {
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getSearchHistory = useCallback(async () => {
    try {
      const res = await apiFetch("/maps/search-history");
      const data = await res.json();
      return res.ok ? data.data : [];
    } catch {
      return [];
    }
  }, []);

  return {
    isSearching,
    isAnalyzing,
    error,
    geocodeArea,
    searchPlaces,
    getPlaceDetails,
    analyzeProductFit,
    addToLeads,
    getSearchHistory,
  };
}
