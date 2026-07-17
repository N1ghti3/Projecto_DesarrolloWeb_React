import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VerveOS — Sistema POS de Restaurante",
  description:
    "VerveOS: punto de venta y gestión para restaurantes. Pedidos en mesa, administración de menú, barra en tiempo real y modo contingencia offline.",
  keywords: ["VerveOS", "POS", "restaurante", "pedidos", "tiempo real", "offline"],
  authors: [{ name: "VerveOS" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} antialiased bg-background text-foreground min-h-screen flex flex-col`}
        suppressHydrationWarning
      >
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
