import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Älykoti",
  description: "Ilmanlaatu ja ilmanvaihto",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#fafaf9",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi">
      <body>{children}</body>
    </html>
  );
}
