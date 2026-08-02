import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";
import { BASE_URL } from "../constants/api";

/**
 * Global favourite state for the current user.
 *
 * Exposes:
 *  - favouriteIds   : Set<string> of listing ids currently saved
 *  - isFavourite(id): boolean helper
 *  - toggleFavourite(id): optimistic toggle (save / unsave) via the API
 *  - refreshFavourites(): re-fetch saved listing ids from the server
 *
 * Used by propertydetail, searchresults and favourites screens so that
 * hearts stay in sync everywhere in the app.
 */
export function useFavourite() {
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refreshFavourites = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        setFavouriteIds(new Set());
        return;
      }
      const res = await fetch(`${BASE_URL}/favourites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        // 401 clears session in the api interceptor; here just treat as empty.
        if (res.status === 401) setFavouriteIds(new Set());
        return;
      }
      const data = await res.json();
      const ids = (data?.savedListings ?? [])
        .map((s: any) => String(s.listing?.id))
        .filter(Boolean);
      setFavouriteIds(new Set(ids));
    } catch {
      // Network failure — keep whatever we already have.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFavourites();
  }, [refreshFavourites]);

  const isFavourite = useCallback(
    (listingId: number | string) => favouriteIds.has(String(listingId)),
    [favouriteIds],
  );

  const toggleFavourite = useCallback(
    async (listingId: number | string): Promise<boolean> => {
      const id = String(listingId);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        return false; // caller decides what to do when not logged in
      }

      const currentlySaved = favouriteIds.has(id);
      // Optimistic update
      setFavouriteIds((prev) => {
        const next = new Set(prev);
        if (currentlySaved) next.delete(id);
        else next.add(id);
        return next;
      });

      try {
        const method = currentlySaved ? "DELETE" : "POST";
        const res = await fetch(`${BASE_URL}/favourites/${id}`, {
          method,
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!res.ok) {
          // Roll back on failure
          setFavouriteIds((prev) => {
            const next = new Set(prev);
            if (currentlySaved) next.add(id);
            else next.delete(id);
            return next;
          });
          return false;
        }
        return true;
      } catch {
        // Roll back on network failure
        setFavouriteIds((prev) => {
          const next = new Set(prev);
          if (currentlySaved) next.add(id);
          else next.delete(id);
          return next;
        });
        return false;
      }
    },
    [favouriteIds],
  );

  return {
    favouriteIds,
    isFavourite,
    toggleFavourite,
    refreshFavourites,
    loading,
  };
}

export default useFavourite;
