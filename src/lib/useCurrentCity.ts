import { useEffect, useState } from "react";
import { getSelectedCity, subscribeCity, type CityKey } from "@/lib/cityStore";

/**
 * Reactive accessor for the global hub/city. SSR-safe (returns "Bangalore"
 * on first server render, then hydrates to the persisted value on mount).
 */
export function useCurrentCity(): CityKey {
  const [city, setCity] = useState<CityKey>("Bangalore");

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity((c) => setCity(c));
  }, []);

  return city;
}
