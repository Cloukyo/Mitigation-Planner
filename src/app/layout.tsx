import type { Metadata } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { themeStorageKey } from "@/components/theme/themeConstants";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mitigation Planner",
  description: "Unofficial FFXIV mitigation timeline planner"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeScript = `
    try {
      const key = ${JSON.stringify(themeStorageKey)};
      const preference = localStorage.getItem(key) || "dark";
      const resolved = preference === "system" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : preference;
      document.documentElement.dataset.themePreference = preference;
      document.documentElement.dataset.theme = resolved === "light" ? "light" : "dark";
    } catch {
      document.documentElement.dataset.themePreference = "dark";
      document.documentElement.dataset.theme = "dark";
    }
  `;
  return (
    <html lang="en" data-theme="dark" data-theme-preference="dark">
      <body>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
