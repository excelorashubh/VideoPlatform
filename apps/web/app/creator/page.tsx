"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell, PageHeading } from "../_components/AppShell";
import { checkCreatorHandle, completeProfileImageUpload, createProfileImageUpload, getCreatorApplication, getStoredSessionToken, saveCreatorApplicationDraft, sendEmailVerification, sendPhoneVerification, submitCreatorApplication, verifyEmail, verifyPhone, type CreatorApplicationResponse } from "../../lib/api";

const categories = ["Gaming", "Education", "Music", "Technology", "Lifestyle", "News", "Sports", "Entertainment"];
const initialForm = { creatorName: "", handle: "", category: "", bio: "" };
const maxImageSize = 5 * 1024 * 1024;

export default function CreatorPage() {
  const router = useRouter();
  const [application, setApplication] = useState<CreatorApplicationResponse | null>(null);
  const [form, setForm] = useState(initialForm);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageKey, setImageKey] = useState<string | null>(null);
  const [handleState, setHandleState] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [stage, setStage] = useState<1 | 2 | 3>(1);
  const [emailCode, setEmailCode] = useState("");
  const [phoneCode, setPhoneCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!getStoredSessionToken()) {
      router.replace("/auth?next=/creator");
      return;
    }

    getCreatorApplication().then((response) => {
      setApplication(response);
      if (response.application) {
        setForm({ creatorName: response.application.creatorName ?? "", handle: response.application.handle ?? "", category: response.application.category ?? "", bio: response.application.bio ?? "" });
        setImageKey(response.application.profileImageKey);
        setTermsAccepted(Boolean(response.application.termsAcceptedAt));
      }
      setPhoneNumber(response.verification?.phoneNumber ?? "");
      if (response.application?.status === "SUBMITTED" || response.application?.status === "APPROVED") setStage(3);
      else if (response.application?.creatorName && response.application.handle && response.application.category && response.application.bio) setStage(2);
    }).catch((requestError: unknown) => {
      const message = requestError instanceof Error ? requestError.message : "Unable to load creator setup";
      if (message.includes("Unauthorized") || message.includes("Missing bearer token")) {
        router.replace("/auth?next=/creator");
        return;
      }
      setError(message);
    }).finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const normalized = form.handle.replace(/^@+/, "");
    if (normalized.length < 3) {
      setHandleState("idle");
      return;
    }
    setHandleState("checking");
    const timer = window.setTimeout(() => {
      checkCreatorHandle(normalized).then((result) => setHandleState(result.available ? "available" : "taken")).catch(() => setHandleState("idle"));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [form.handle]);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setNotice(null);
    setError(null);
  }

  function validateImage(file: File) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Use a JPEG, PNG, or WebP image.";
    if (file.size > maxImageSize) return "Profile images must be 5 MB or smaller.";
    return null;
  }

  async function uploadImage(file: File) {
    const validationError = validateImage(file);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setImagePreview(URL.createObjectURL(file));
    setUploadingImage(true);
    setImageProgress(0);
    try {
      const upload = await createProfileImageUpload({ contentType: file.type, fileSize: file.size });
      await new Promise<void>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("PUT", upload.uploadUrl);
        request.setRequestHeader("Content-Type", file.type);
        request.upload.onprogress = (event) => { if (event.lengthComputable) setImageProgress(Math.round(event.loaded / event.total * 100)); };
        request.onload = () => request.status >= 200 && request.status < 300 ? resolve() : reject(new Error("Image upload failed"));
        request.onerror = () => reject(new Error("Image upload failed"));
        request.send(file);
      });
      const completed = await completeProfileImageUpload(upload.key);
      setImageKey(completed.key);
      setNotice("Profile picture uploaded.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload profile picture");
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  }

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void uploadImage(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) void uploadImage(file);
  }

  async function persist(submit: boolean) {
    if (submit && handleState === "taken") {
      setError("Choose an available channel handle before continuing.");
      return;
    }
    setError(null);
    setNotice(null);
    submit ? setSubmitting(true) : setSaving(true);
    try {
      const input = { ...form, handle: form.handle.replace(/^@+/, ""), profileImageKey: imageKey ?? undefined, termsAccepted };
      const saved = submit ? await submitCreatorApplication(input) : await saveCreatorApplicationDraft(input);
      setApplication((current) => ({ isCreator: false, application: saved, verification: current?.verification }));
      if (!submit) setStage(2);
      else setStage(3);
      setNotice(submit ? "Your application is ready for review." : "Draft saved.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save creator setup");
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  }

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void persist(false);
  }

  const submitted = application?.application?.status === "SUBMITTED" || application?.application?.status === "APPROVED";
  const isCreator = application?.isCreator;
  const verification = application?.verification;

  async function sendEmail() { try { await sendEmailVerification(); setNotice("Verification code sent to your email."); } catch (error) { setError(error instanceof Error ? error.message : "Unable to send email code"); } }
  async function confirmEmail() { try { const result = await verifyEmail(emailCode) as typeof verification; setApplication((current) => current ? { ...current, verification: result } : current); setNotice("Email verified."); } catch (error) { setError(error instanceof Error ? error.message : "Unable to verify email"); } }
  async function sendPhone() { try { await sendPhoneVerification(phoneNumber); setNotice("Phone code sent. In development, check the API terminal."); } catch (error) { setError(error instanceof Error ? error.message : "Unable to send phone code"); } }
  async function confirmPhone() { try { const result = await verifyPhone(phoneCode) as typeof verification; setApplication((current) => current ? { ...current, verification: result } : current); setNotice("Phone verified."); } catch (error) { setError(error instanceof Error ? error.message : "Unable to verify phone"); } }

  return (
    <AppShell eyebrow="Creator" title="Creator Setup">
      <PageHeading eyebrow="Creator setup" title="Build your creator profile" />
      <div className="creator-progress" aria-label="Creator journey progress">{["Profile", "Verify", "Review", "Monetise", "Payments"].map((label, index) => <span key={label} className={index + 1 < stage ? "is-complete" : index + 1 === stage ? "is-current" : "is-locked"}>{index + 1 < stage ? "✓" : index + 1} <small>{label}</small></span>)}</div>
      <div className="creator-intro"><p>Set up your channel identity and tell viewers what your channel is about.</p><span>Step {stage} of 5</span></div>
      {loading ? <p className="muted">Loading creator setup...</p> : null}
      {!loading && isCreator ? <section className="creator-status-panel"><p className="kicker">Creator access active</p><h3>Your creator profile is ready.</h3><p className="muted">Creator tools are already unlocked for this account.</p></section> : null}
      {!loading && !isCreator && submitted ? <section className="creator-status-panel"><p className="kicker">Step 3 of 5 · {application.application?.status === "APPROVED" ? "Approved" : "Application submitted"}</p><h3>{application.application?.creatorName}</h3><p className="muted">{application.application?.status === "APPROVED" ? "Your creator account is active." : "Your creator application is under review. You can return here to see its status."}</p><ul className="creator-checklist"><li>✓ Creator profile completed</li><li>✓ Email verified</li><li>✓ Phone verified</li><li>✓ Application submitted</li><li>{application.application?.status === "APPROVED" ? "✓ Creator active" : "⏳ Waiting for approval"}</li></ul></section> : null}
      {!loading && !isCreator && !submitted && stage === 1 ? (
        <form className="creator-setup" onSubmit={submitProfile}>
          <section className="creator-card creator-profile-card">
            <div className="creator-card-heading"><div><p className="kicker">Creator Profile</p><h2>Channel identity</h2></div><span className="creator-step">01</span></div>
            <div className="creator-profile-layout">
              <div className="profile-upload" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
                <div className="creator-avatar-preview">{imagePreview ? <img src={imagePreview} alt="Profile preview" /> : <span>{form.creatorName.slice(0, 1).toUpperCase() || "G"}</span>}</div>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={handleFile} />
                <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>{uploadingImage ? `Uploading ${imageProgress}%` : imagePreview || imageKey ? "Change picture" : "Upload picture"}</button>
                <small>JPEG, PNG, or WebP · max 5 MB</small>
              </div>
              <div className="creator-fields">
                <label><span className="creator-label-row">Creator name<span className="required-marker">*</span></span><input required minLength={2} maxLength={50} value={form.creatorName} onChange={(event) => updateField("creatorName", event.target.value)} placeholder="Ragx Shubh" /><small>{form.creatorName.length} / 50</small></label>
                <label><span className="creator-label-row">Channel handle<span className="required-marker">*</span></span><div className="handle-input"><b>@</b><input required minLength={3} maxLength={30} pattern="[A-Za-z0-9-]+" value={form.handle.replace(/^@+/, "")} onChange={(event) => updateField("handle", event.target.value)} placeholder="your-handle" /></div>{handleState === "checking" ? <small>Checking availability...</small> : null}{handleState === "available" ? <small className="field-success">Available</small> : null}{handleState === "taken" ? <small className="field-error">This handle is already taken</small> : null}</label>
                <label><span className="creator-label-row">Category<span className="required-marker">*</span></span><select required value={form.category} onChange={(event) => updateField("category", event.target.value)}><option value="">Select a category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
              </div>
            </div>
          </section>
          <section className="creator-card">
            <div className="creator-card-heading"><div><p className="kicker">About your channel</p><h2>Give viewers a reason to stay</h2></div><span className="creator-step">02</span></div>
            <label><span className="creator-label-row">Channel description<span className="required-marker">*</span></span><textarea required minLength={20} maxLength={500} rows={6} value={form.bio} onChange={(event) => updateField("bio", event.target.value)} placeholder="Tell viewers what you create, who it is for, and what they can expect." /><small>{form.bio.length} / 500</small></label>
          </section>
          {error ? <p className="auth-error" role="alert">{error}</p> : null}
          {notice ? <p className="form-status form-status-success" role="status">{notice}</p> : null}
          <div className="creator-actions"><button type="button" className="secondary-button" onClick={() => void persist(false)} disabled={saving || submitting}>{saving ? "Saving..." : "Save draft"}</button><button type="submit" className="primary-button" disabled={saving || submitting || uploadingImage}>{saving ? "Saving..." : "Continue to Verification"}<span aria-hidden="true">→</span></button></div>
        </form>
      ) : null}
      {!loading && !isCreator && !submitted && stage === 2 ? <section className="creator-setup creator-verification"><section className="creator-card"><div className="creator-card-heading"><div><p className="kicker">Email or Phone Verification</p><h2>Verify your account</h2></div><span className="creator-step">02</span></div><p className="muted">Verify your email or phone number to continue.</p><div className="verification-grid"><article><h3>Email verification</h3><p>{verification?.email}</p>{verification?.emailVerified ? <p className="field-success">✓ Email verified</p> : <><button type="button" className="secondary-button" onClick={() => void sendEmail()}>Send verification code</button><input inputMode="numeric" maxLength={6} value={emailCode} onChange={(event) => setEmailCode(event.target.value)} placeholder="6-digit code" /><button type="button" className="primary-button" onClick={() => void confirmEmail()}>Verify email</button></>}</article><article><h3>Phone verification</h3>{verification?.phoneVerified ? <p className="field-success">✓ Phone verified</p> : <><input value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} placeholder="+91 98765 43210" /><button type="button" className="secondary-button" onClick={() => void sendPhone()}>Send verification code</button><input inputMode="numeric" maxLength={6} value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} placeholder="6-digit code" /><button type="button" className="primary-button" onClick={() => void confirmPhone()}>Verify phone</button></>}</article></div><label className="creator-terms"><input type="checkbox" checked={termsAccepted} onChange={(event) => setTermsAccepted(event.target.checked)} /> I agree to the Creator Terms and Policies.</label>{error ? <p className="auth-error" role="alert">{error}</p> : null}{notice ? <p className="form-status form-status-success" role="status">{notice}</p> : null}<div className="creator-actions"><button type="button" className="secondary-button" onClick={() => { setStage(1); setError(null); setNotice(null); }}>Back to profile</button><button type="button" className="primary-button" disabled={!(verification?.emailVerified || verification?.phoneVerified) || !termsAccepted || submitting} onClick={() => void persist(true)}>{submitting ? "Submitting..." : "Submit application"}</button></div></section></section> : null}
    </AppShell>
  );
}


