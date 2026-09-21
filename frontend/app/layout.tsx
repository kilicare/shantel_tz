import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "../styles/responsive.css";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SHANTEL | Sales Operations",
  description: "Sales operations for Shantel teams.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SHANTEL" },
  icons: { icon: "/shantel-icon-192x192.png", apple: "/shantel-icon-192x192.png" },
};

export const viewport: Viewport = { themeColor: "#163A35" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PWAInstallPrompt />
        <OfflineIndicator />
        <UpdatePrompt />
        {children}
      </body>
    </html>
  );
}
