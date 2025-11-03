import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { SupabaseProvider } from "@/components/providers/supabase-provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Monitoramento de Contratos e RS",
  description:
    "Plataforma da BU para controle de contratos, requisições de serviço e recursos ATE."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const session =
    supabase !== null ? (await supabase.auth.getSession()).data.session : null;

  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <SupabaseProvider initialSession={session}>{children}</SupabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
