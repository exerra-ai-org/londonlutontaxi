import { useEffect, useRef, useState } from "react";

interface Coords {
  lat: number;
  lon: number;
}

interface Props {
  value: string;
  onChange: (address: string, coords?: Coords) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/**
 * Address input with Google Places autocomplete.
 * Gracefully degrades to a plain text input when VITE_GOOGLE_MAPS_API_KEY is absent.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  placeholder,
  required,
  className,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [ready, setReady] = useState(false);

  // Initialise Places autocomplete once the Maps script is loaded
  useEffect(() => {
    if (!API_KEY || !window.google?.maps?.places) return;

    if (autocompleteRef.current || !inputRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        componentRestrictions: { country: "gb" },
        fields: ["formatted_address", "geometry"],
      },
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current!.getPlace();
      const address = place.formatted_address ?? inputRef.current!.value;
      const location = place.geometry?.location;
      const coords = location
        ? { lat: location.lat(), lon: location.lng() }
        : undefined;
      onChange(address, coords);
    });

    setReady(true);
  }, [onChange]);

  // Poll for Maps availability (Maps SDK loads async)
  useEffect(() => {
    if (!API_KEY || ready) return;
    const timer = setInterval(() => {
      if (window.google?.maps?.places) {
        clearInterval(timer);
        setReady(true); // triggers the init effect
      }
    }, 300);
    return () => clearInterval(timer);
  }, [ready]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className={className}
      autoComplete="off"
    />
  );
}
