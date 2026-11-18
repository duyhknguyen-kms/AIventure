import { Dashboard } from "@/components/Dashboard";

// The dashboard is a client component (state, fetch, localStorage); the page
// itself stays a server component so `layout.tsx` metadata applies.
export default function Home() {
  return <Dashboard />;
}
