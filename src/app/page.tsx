import type { Metadata } from "next";
import { LandingPage } from "@/components/LandingPage";

export const metadata: Metadata = {
  title: "AgentLane — Guarded agentic commerce",
  description:
    "From shopping intent to verified checkout with live marketplace discovery, policy controls, XSGD authorization, and a human-confirmed browser companion.",
};

export default function Home() {
  return <LandingPage />;
}
