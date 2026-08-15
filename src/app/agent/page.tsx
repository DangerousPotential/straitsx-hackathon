import type { Metadata } from "next";
import { CommerceWorkspace } from "@/components/CommerceWorkspace";
import { getBudgetPolicy } from "@/lib/budget";

export const metadata: Metadata = {
  title: "Procurement Agent — AgentLane",
  description:
    "Find, rank, verify, and authorize a sandbox checkout with AgentLane.",
};

export default function AgentPage() {
  return <CommerceWorkspace initialBudgetPolicy={getBudgetPolicy()} />;
}
