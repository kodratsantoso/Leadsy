declare namespace google {
  namespace maps {
    interface LatLngLiteral {
      lat: number;
      lng: number;
    }

    interface LatLng {
      lat(): number;
      lng(): number;
    }

    interface GeocoderGeometry {
      location: LatLng;
    }

    interface GeocoderResult {
      geometry: GeocoderGeometry;
    }

    type GeocoderStatus = "OK" | string;

    interface GeocoderRequest {
      address?: string;
    }

    class Geocoder {
      geocode(
        request: GeocoderRequest,
        callback: (results: GeocoderResult[] | null, status: GeocoderStatus) => void,
      ): void;
    }
  }
}
