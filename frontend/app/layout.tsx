import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../styles/responsive.css";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { UpdatePrompt } from "@/components/UpdatePrompt";
import { SplashScreen } from "@/components/SplashScreen";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SHANTEL | Sales Operations",
  description: "Sales operations for Shantel teams.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SHANTEL" },
  icons: { icon: "/shantel-icon-192x192.png", apple: "/shantel-icon-192x192.png" },
};

export const viewport: Viewport = { themeColor: "#172B4D" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <SplashScreen />
        <PWAInstallPrompt />
        <OfflineIndicator />
        <UpdatePrompt />
        {children}
      </body>
    </html>
  );
}
