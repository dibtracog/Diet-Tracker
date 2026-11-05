import type { MetadataRoute } from "next";

/** Lets the app be installed to the phone's home screen (once served over https). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Diet Tracker",
    short_name: "Diet",
    description: "Personal diet tracker",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0c2a1f",
    theme_color: "#0c2a1f",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
