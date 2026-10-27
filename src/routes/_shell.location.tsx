import { createFileRoute } from "@tanstack/react-router";
import { AppWindow } from "@/components/pt/shell/AppWindow";
import { LocationApp } from "@/components/pt/apps/LocationApp";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/_shell/location")({
  head: () => pageHead("Location Center", "Ask people to share their location with consent and follow it live on a map."),
  component: Page,
});

function Page() {
  return (
    <AppWindow title="Location Center" icon="map-pin" source="live">
      <LocationApp />
    </AppWindow>
  );
}
