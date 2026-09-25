import { AppShell, PageHeading } from "../../_components/AppShell";

export default function StudioSettingsPage() {
  return <AppShell active="/studio/settings" eyebrow="Creator Studio" title="Channel settings"><PageHeading eyebrow="Identity" title="Shape your channel" /><form className="settings-form"><label>Channel name<input defaultValue="GVP Editorial" /></label><label>Handle<input defaultValue="@gvp-editorial" /></label><label>About<textarea defaultValue="A considered collection of long-form ideas and live sessions." rows={5} /></label><button className="primary-button" type="button">Save changes</button></form></AppShell>;
}
