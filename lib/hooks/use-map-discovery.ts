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
};

export function useMapDiscovery() {
  const [isSearching, setIsSearching] = useState(false);
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
  ): Promise<DiscoveredLead[]> => {
    try {
      setIsSearching(true);
      setError(null);
      
      const queryParams = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
        radius: radius.toString(),
        search_mode: searchMode,
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

  const addToLeads = useCallback(async (
    place: DiscoveredLead,
    aiMode: "full_ai" | "hybrid" | "manual"
  ) => {
    try {
      setIsSearching(true);
      if (!place.external_place_id) {
        throw new Error("This map result is missing its Google Place ID. Re-open the result and try again.");
      }
      const res = await apiFetch(`/maps/add-to-leads`, {
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
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || data.error || "Failed to add lead");
      }
      return data.data;
    } catch (err) {
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, []);

  const getSearchHistory = useCallback(async () => {
    try {
      const res = await apiFetch(`/maps/search-history`);
      const data = await res.json();
      return res.ok ? data.data : [];
    } catch {
      return [];
    }
  }, []);

  return {
    isSearching,
    error,
    geocodeArea,
    searchPlaces,
    getPlaceDetails,
    addToLeads,
    getSearchHistory,
  };
}
