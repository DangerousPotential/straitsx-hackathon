import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://straitsx-hackathon.vercel.app"),
  title: {
    default: "AgentLane — Guarded agentic commerce",
    template: "%s",
  },
  description:
    "An AI procurement agent that moves from shopping intent to verified checkout with XSGD on Avalanche.",
  openGraph: {
    title: "AgentLane — Guarded agentic commerce",
    description:
      "AI procurement, live checkout verification, policy-bounded XSGD authorization, and explicit human confirmation.",
    type: "website",
    url: "/",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={manrope.variable} data-scroll-behavior="smooth"><body>{children}</body></html>;
}
