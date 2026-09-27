import { Radio } from "lucide-react";
import { CreatorCapabilityState } from "../_components/CreatorCapabilityState";

export default function CreatorLivePage() {
	return <CreatorCapabilityState icon={Radio} eyebrow="Streaming" title="Live" description="GVP has no live-stream schedule, RTMP ingest, or stream-key service yet. No stream or viewer metrics are available." />;
}
