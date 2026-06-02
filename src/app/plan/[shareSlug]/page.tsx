import { RemotePlanPage } from "@/components/plans/RemotePlanPage";

export default async function SharedPlanPage({ params }: { params: Promise<{ shareSlug: string }> }) {
  const { shareSlug } = await params;
  return <RemotePlanPage shareSlug={shareSlug} />;
}
