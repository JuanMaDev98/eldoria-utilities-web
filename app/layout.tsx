import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Eldoria Zones & Monsters",
  description: "Interactive database of Eldoria zones and monsters with XP, stamina cost, stats and drops."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}
