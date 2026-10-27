import { createFileRoute, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/pt/head";

export const Route = createFileRoute("/")({
  head: () => pageHead("Pandatechs Desktop", "Pandatechs Desktop by Pandatechs Enterprises: a branded desktop with the P personal assistant."),
  beforeLoad: () => {
    throw redirect({ to: "/boot-preview" });
  },
});
