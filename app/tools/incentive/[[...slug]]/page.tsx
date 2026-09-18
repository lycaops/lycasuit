import { IncentiveApp } from "./incentive-app"

// Catch-all so the tool's own React Router owns everything under
// /tools/incentive (statement, scheme, calculator, users, ...).
export default function IncentivePage() {
  return <IncentiveApp />
}
