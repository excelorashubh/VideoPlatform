import { AppShell, PageHeading } from "../../_components/AppShell";

export default function AccountSettingsPage() {
  return <AppShell eyebrow="Account" title="Account settings"><PageHeading eyebrow="Your details" title="Keep your account current" /><form className="settings-form"><label>Email address<input defaultValue="creator@example.com" type="email" /></label><label>Display name<input defaultValue="GVP Creator" /></label><button className="primary-button" type="button">Save account</button></form></AppShell>;
}
