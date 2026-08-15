import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Personal AI Coach",
    short_name: "AI Coach",
    description: "A daily system for focus, resilience, health, growth, and purposeful living.",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f3ef",
    theme_color: "#171717",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
