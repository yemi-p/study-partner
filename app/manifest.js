export default function manifest() {
  return {
    name: "Study Partner",
    short_name: "Study Partner",
    description: "SS1 study app",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#FFF6E8",
    theme_color: "#FFF6E8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
