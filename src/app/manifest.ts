import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Gokul Glimpses",
    short_name: "Glimpses",
    description:
      "A private space for Balagokulam families to share holiday glimpses.",
    start_url: "/",
    display: "standalone",
    background_color: "#fff8e7",
    theme_color: "#0e7490",
    orientation: "portrait",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
