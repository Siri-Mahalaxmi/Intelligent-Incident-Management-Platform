import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "IIMP — Intelligent Incident Management",
  description: "Multi-tenant Intelligent Incident Management Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        {/*
         * AuthProvider is the only global provider here.
         * IncidentsProvider lives inside the (shell) layout so it only
         * mounts after authentication is confirmed — preventing it from
         * attempting an authenticated fetch before a session exists.
         */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
