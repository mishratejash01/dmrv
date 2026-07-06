import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const metadata: Metadata = { title: "Onboarding" };

export default async function OnboardingPage() {
  const user = await getUser();
  if (!user) redirect("/login");
  return <OnboardingWizard />;
}
