"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Image, LayoutGrid, Save, Upload } from "lucide-react";
import { completeChannelAssetUpload, getCreatorCustomization, createChannelAssetUpload, updateCreatorCustomization, type CreatorCustomization } from "../../../lib/api";

type CustomizationTab = "layout" | "branding" | "basic";
type AssetKind = "avatar" | "banner";

const maxSizes: Record<AssetKind, number> = { avatar: 5 * 1024 * 1024, banner: 10 * 1024 * 1024 };
const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

export function CreatorCustomizationDashboard() {
  const [data, setData] = useState<CreatorCustomization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<AssetKind | null>(null);
  const [tab, setTab] = useState<CustomizationTab>("layout");
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const bannerInput = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const result = await getCreatorCustomization();
      setData(result);
      setDisplayName(result.channel?.displayName ?? result.creator.name);
      setHandle(result.channel?.handle ?? result.creator.handle ?? "");
      setDescription(result.channel?.description ?? "");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load channel customization.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => () => {
    if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    if (bannerPreview?.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
  }, [avatarPreview, bannerPreview]);

  async function saveBasicInfo(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice("");
    try {
      await updateCreatorCustomization({ displayName, handle, description });
      await load();
      setNotice("Channel information saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save channel information.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAsset(kind: AssetKind, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!allowedTypes.includes(file.type)) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size <= 0 || file.size > maxSizes[kind]) {
      setError(`${kind === "avatar" ? "Profile pictures" : "Banners"} must be smaller than ${maxSizes[kind] / (1024 * 1024)} MB.`);
      return;
    }

    const preview = URL.createObjectURL(file);
    kind === "avatar" ? setAvatarPreview(preview) : setBannerPreview(preview);
    setUploading(kind);
    setError(null);
    setNotice("");
    try {
      const upload = await createChannelAssetUpload({ kind, contentType: file.type, fileSize: file.size });
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", upload.uploadUrl);
        request.setRequestHeader("Content-Type", file.type);
        request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Image upload failed"));
        request.onerror = () => reject(new Error("Image upload failed"));
        request.send(file);
      });
      await completeChannelAssetUpload({ kind, key: upload.key });
      await load();
      setNotice(kind === "avatar" ? "Profile picture updated." : "Channel banner updated.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload this image.");
      kind === "avatar" ? setAvatarPreview(null) : setBannerPreview(null);
      URL.revokeObjectURL(preview);
    } finally {
      setUploading(null);
    }
  }

  if (loading && !data) return <div className="creator-page-loading" aria-busy="true">Loading channel customization...</div>;
  if (error && !data) return <section className="creator-feature-empty" role="alert"><h1>Unable to load customization</h1><p>{error}</p><button type="button" className="creator-secondary-button" onClick={() => void load()}>Retry</button></section>;
  if (!data?.channel) return <section className="creator-feature-empty"><h1>No channel found</h1><p>An owned channel is required to customize branding.</p></section>;

  const channel = data.channel;
  const avatarUrl = avatarPreview ?? channel.avatarUrl;
  const bannerUrl = bannerPreview ?? channel.bannerUrl;

  return <main className="creator-customization-page">
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">Channel</p><h1>Customization</h1><p>Manage how your channel appears across GVP.</p></div></header>
    <div className="creator-customization-tabs" role="tablist" aria-label="Channel customization sections">{([["layout", "Layout", LayoutGrid], ["branding", "Branding", Image], ["basic", "Basic info", Save]] as const).map(([value, label, Icon]) => <button type="button" role="tab" aria-selected={tab === value} className={tab === value ? "is-active" : ""} key={value} onClick={() => setTab(value)}><Icon size={16} aria-hidden="true" />{label}</button>)}</div>
    {error ? <p className="creator-page-error" role="alert">{error}</p> : null}{notice ? <p className="creator-page-notice" role="status">{notice}</p> : null}
    {tab === "layout" ? <section className="creator-settings-panel"><div><p className="creator-studio-eyebrow">Channel layout</p><h2>Content sections</h2><p>GVP currently fills channel pages from your published videos and playlists automatically. Custom section ordering, trailers, and featured-video settings are not stored by the current channel model.</p></div><div className="creator-layout-preview"><span><LayoutGrid size={20} aria-hidden="true" /></span><div><strong>{channel.displayName}</strong><small>@{channel.handle}</small><p>Published videos and public playlists appear from your existing channel library.</p></div></div></section> : null}
    {tab === "branding" ? <div className="creator-customization-branding">
      <section className="creator-settings-panel"><div className="creator-settings-panel-heading"><div><p className="creator-studio-eyebrow">Profile picture</p><h2>Channel avatar</h2><p>JPEG, PNG, or WebP · up to 5 MB</p></div><div className="creator-branding-avatar">{avatarUrl ? <img src={avatarUrl} alt="Channel avatar preview" /> : <span>{channel.displayName.slice(0, 1).toUpperCase()}</span>}</div></div><input ref={avatarInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void uploadAsset("avatar", event)} /><button type="button" className="creator-secondary-button" disabled={uploading !== null} onClick={() => avatarInput.current?.click()}><Upload size={15} aria-hidden="true" />{uploading === "avatar" ? "Uploading..." : channel.avatarKey ? "Change profile picture" : "Upload profile picture"}</button></section>
      <section className="creator-settings-panel"><div className="creator-settings-panel-heading"><div><p className="creator-studio-eyebrow">Banner image</p><h2>Channel banner</h2><p>JPEG, PNG, or WebP · up to 10 MB</p></div></div><div className="creator-branding-banner">{bannerUrl ? <img src={bannerUrl} alt="Channel banner preview" /> : <span>Banner preview</span>}</div><input ref={bannerInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(event) => void uploadAsset("banner", event)} /><button type="button" className="creator-secondary-button" disabled={uploading !== null} onClick={() => bannerInput.current?.click()}><Upload size={15} aria-hidden="true" />{uploading === "banner" ? "Uploading..." : channel.bannerKey ? "Change banner" : "Upload banner"}</button></section>
      <section className="creator-settings-panel creator-settings-note"><p>Channel watermark customization is not supported by the current data model.</p></section>
    </div> : null}
    {tab === "basic" ? <form className="creator-settings-panel creator-customization-basic" onSubmit={(event) => void saveBasicInfo(event)}><div><p className="creator-studio-eyebrow">Channel profile</p><h2>Basic information</h2><p>These details are shown on your channel and public video pages.</p></div><label>Channel name<input required minLength={2} maxLength={50} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label><label>Handle<div className="creator-handle-input"><span>@</span><input required minLength={3} maxLength={30} pattern="[A-Za-z0-9-]+" value={handle} onChange={(event) => setHandle(event.target.value)} /></div></label><label>Description<textarea rows={5} maxLength={500} value={description} onChange={(event) => setDescription(event.target.value)} /><small>{description.length} / 500</small></label><div className="creator-form-actions"><button type="submit" className="creator-studio-primary" disabled={saving || !displayName.trim() || !handle.trim()}><Save size={15} aria-hidden="true" />{saving ? "Saving..." : "Save changes"}</button></div></form> : null}
  </main>;
}