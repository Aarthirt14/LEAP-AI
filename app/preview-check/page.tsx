import { notFound } from "next/navigation";
import { ViewportCheck } from "@/components/leap/viewport-check";

export const metadata = { title: "LEAP preview layout check", robots: { index: false, follow: false } };

export default function PreviewCheckPage() {
  if (process.env.VERCEL_ENV !== "preview" && process.env.NODE_ENV !== "development") notFound();
  return <ViewportCheck apiOrigin={process.env.NEXT_PUBLIC_STAGING_RELAY === "true" ? "/leap-api (Vercel relay to staging)" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />;
}
