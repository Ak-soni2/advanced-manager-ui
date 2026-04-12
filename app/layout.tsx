import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "Automated Task Manager",
  description: "Meeting transcripts → AI task extraction → Team dashboard",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎤</text></svg>" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="gradient-bg">
            <div className="gradient-orb orb-1" />
            <div className="gradient-orb orb-2" />
          </div>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
