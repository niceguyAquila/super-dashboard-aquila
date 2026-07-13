import { notFound } from "next/navigation";

// ADS performance is temporarily disabled. Restore the previous page body
// (and the ADS nav item in app-shell) when re-enabling.
export default async function AdsPage() {
  notFound();
}
