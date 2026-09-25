import { AppShell, PageHeading } from "../../_components/AppShell";

export default function StudioUploadPage() {
  return <AppShell active="/studio/upload" eyebrow="Creator Studio" title="Upload a video"><PageHeading eyebrow="New content" title="Prepare your next release" /><form className="upload-form"><label>Video file<input type="file" accept="video/*" /></label><label>Title<input placeholder="Give your video a clear title" /></label><label>Description<textarea placeholder="Tell viewers what they will find here" rows={5} /></label><div className="form-actions"><span>Uploads use resumable object storage sessions.</span><button className="primary-button" type="button">Create upload session</button></div></form></AppShell>;
}
