import { APIProvider } from "@vis.gl/react-google-maps";
import type { ReactNode } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

interface Props {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: Props) {
  if (!API_KEY) {
    // No API key — render children without Maps context
    return <>{children}</>;
  }
  return (
    <APIProvider apiKey={API_KEY} libraries={["places"]}>
      {children}
    </APIProvider>
  );
}
