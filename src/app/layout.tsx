import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PharmIntel", template: "%s | PharmIntel" },
  description: "Plateforme sécurisée de veille concurrentielle pharmaceutique",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/logo.svg", apple: "/logo.svg" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#123d36" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="fr" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem('pharmintel-theme')||'light'}catch(e){}` }} /></head><body>{children}</body></html>;
}
