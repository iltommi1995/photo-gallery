"use client";

import { useEffect, useRef, useState } from "react";

import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

export type GeocodeResult = { label: string; lat: number; lng: number };

type LocationAutocompleteProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: GeocodeResult) => void;
};

/**
 * Free-text location input with type-ahead suggestions from OpenStreetMap
 * (via /api/admin/geocode) — picking a suggestion keeps the grouping on
 * /places consistent (no more "Montenegro" vs "Monteneg" as separate
 * places). Typing without picking a suggestion still saves as plain text;
 * this suggests, it doesn't lock the field down.
 */
export function LocationAutocomplete({
  id,
  value,
  onChange,
  onSelect,
}: LocationAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const query = value.trim();

  useEffect(() => {
    // Short queries are handled below at render time (queryTooShort) —
    // nothing to fetch or clear here, avoiding a setState call directly
    // in the effect body for that case.
    if (query.length < 2) return;
    const thisRequest = ++requestId.current;
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/admin/geocode?q=${encodeURIComponent(query)}`)
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data: { results?: GeocodeResult[] }) => {
          if (thisRequest === requestId.current) setResults(data.results ?? []);
        })
        .finally(() => {
          if (thisRequest === requestId.current) setLoading(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const queryTooShort = query.length < 2;
  const effectiveResults = queryTooShort ? [] : results;
  const effectiveLoading = queryTooShort ? false : loading;

  return (
    <Combobox<GeocodeResult>
      items={effectiveResults}
      itemToStringLabel={(result) => result.label}
      inputValue={value}
      onInputValueChange={(next) => onChange(next)}
      onValueChange={(result) => {
        if (result) onSelect?.(result);
      }}
      open={open && !queryTooShort}
      onOpenChange={setOpen}
      filter={null}
    >
      <ComboboxInput id={id} autoComplete="off" showTrigger={false} />
      <ComboboxContent>
        <ComboboxList>
          {effectiveLoading ? (
            <div className="text-muted-foreground px-2 py-4 text-center text-sm">
              Searching…
            </div>
          ) : (
            <>
              <ComboboxEmpty>No matches</ComboboxEmpty>
              <ComboboxCollection>
                {(result: GeocodeResult) => (
                  <ComboboxItem
                    key={`${result.label}-${result.lat}-${result.lng}`}
                    value={result}
                  >
                    {result.label}
                  </ComboboxItem>
                )}
              </ComboboxCollection>
            </>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
