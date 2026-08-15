import { CommerceWorkspace } from "@/components/CommerceWorkspace";
import { getBudgetPolicy } from "@/lib/budget";

export default function Home() {
  return <CommerceWorkspace initialBudgetPolicy={getBudgetPolicy()} />;
}
