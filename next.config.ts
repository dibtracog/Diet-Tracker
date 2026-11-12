import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the dev-only "N" badge; it overlaps the phone tab bar and header.
  devIndicators: false,
  // Lets a phone on the same Wi-Fi load the dev server (dev only; update if
  // the laptop's Wi-Fi IP changes).
  allowedDevOrigins: ["172.17.94.75"],
  async headers() {
    return [
      {
        // The browser must always check for a new service worker.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
