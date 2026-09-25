import { AppShell, PageHeading, VideoCards } from "../_components/AppShell";

export default function SubscriptionsPage() {
  return <AppShell active="/subscriptions" title="Your subscriptions"><PageHeading eyebrow="Following" title="Latest from your channels" action="Manage" /><VideoCards titles={["The studio notes: episode 04", "Live from the north pier", "A practical history of typography"]} /></AppShell>;
}