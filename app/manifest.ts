import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asset Comparison",
    short_name: "Comparison",
    description: "Compare images and videos side by side",
    start_url: ".",
    scope: ".",
    display: "standalone",
    background_color: "#15161a",
    theme_color: "#15161a",
    icons: [
      {
        src: "icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "maskable-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
