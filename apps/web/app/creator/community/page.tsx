import { MessagesSquare } from "lucide-react";
import { CreatorCapabilityState } from "../_components/CreatorCapabilityState";

export default function CreatorCommunityPage() {
	return <CreatorCapabilityState icon={MessagesSquare} eyebrow="Audience" title="Community" description="Community posts, polls, and audience-post media are not supported by the current GVP data model." />;
}
