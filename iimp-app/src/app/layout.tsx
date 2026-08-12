import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { IncidentsProvider } from "@/context/IncidentsContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IIMP — Incident Dashboard",
  description: "Intelligent Incident Management Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        <IncidentsProvider>{children}</IncidentsProvider>
      </body>
    </html>
  );
}
