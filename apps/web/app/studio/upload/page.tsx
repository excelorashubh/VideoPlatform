"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../_components/AppShell";
import { completeThumbnailUpload, completeUploadSession, createCreatorDraftVideo, createThumbnailUpload, createUploadSession, getCreatorDashboard, removeCreatorThumbnail, updateCreatorVideo } from "../../../lib/api";

type UploadStage = "idle" | "ready" | "validating" | "creating-video" | "thumbnail" | "creating-session" | "uploading" | "verifying" | "processing" | "queued" | "complete" | "error";

const supportedTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska"
};

const stageLabels: Record<UploadStage, string> = {
  idle: "Select a video",
  ready: "Ready",
  validating: "Validating video",
  "creating-video": "Preparing video",
  thumbnail: "Uploading thumbnail",
  "creating-session": "Preparing upload",
  uploading: "Uploading video",
  verifying: "Verifying upload",
  processing: "Processing",
  queued: "Processing queued",
  complete: "Upload complete",
  error: "Upload failed"
};

function fileType(file: File) {
  if (Object.values(supportedTypes).includes(file.type)) return file.type;
  const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;
  return supportedTypes[extension] ?? null;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function thumbnailType(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (allowed.includes(file.type)) return file.type;
  if (!file.type || file.type === "application/octet-stream") {
    const extension = file.name.split(".").pop()?.toLowerCase();
    return extension === "jpg" || extension === "jpeg" ? "image/jpeg" : extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : null;
  }
  return null;
}

function uploadWithProgress(url: string, file: File, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", url);
    request.setRequestHeader("Content-Type", file.type || fileType(file) || "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    request.onload = () => request.status >= 200 && request.status < 300
      ? resolve()
      : reject(new Error(`Upload failed with status ${request.status}.`));
    request.send(file);
  });
}

async function digestFile(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default function StudioUploadPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const inFlightRef = useRef(false);
  const [videoId, setVideoId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">("PUBLIC");
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState("");
  const [persistedThumbnailKey, setPersistedThumbnailKey] = useState("");
  const [stage, setStage] = useState<UploadStage>("idle");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const busy = ["validating", "creating-video", "thumbnail", "creating-session", "uploading", "verifying", "processing"].includes(stage);

  useEffect(() => {
    if (!file) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!thumbnail) {
      setThumbnailPreview("");
      return;
    }
    const url = URL.createObjectURL(thumbnail);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnail]);

  function clearFile() {
    setFile(null);
    setDuration(null);
    setProgress(0);
    setStage("idle");
    setMessage("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function startAnotherUpload() {
    clearFile();
    setThumbnail(null);
    setThumbnailPreview("");
    setPersistedThumbnailKey("");
    setTitle("");
    setDescription("");
    setVisibility("PUBLIC");
    setVideoId("");
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

  function selectThumbnail(nextFile: File | undefined) {
    if (!nextFile) return;
    if (!thumbnailType(nextFile)) {
      setError("Thumbnail upload failed. Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (nextFile.size <= 0 || nextFile.size > 10 * 1024 * 1024) {
      setError("Thumbnail upload failed. Choose an image smaller than 10 MB.");
      return;
    }
    setError("");
    setThumbnail(nextFile);
  }

  async function removeThumbnail() {
    if (persistedThumbnailKey && videoId) {
      try {
        await removeCreatorThumbnail(videoId, persistedThumbnailKey);
      } catch {
        setError("We couldn't remove the saved thumbnail. Please try again.");
        return;
      }
    }
    setThumbnail(null);
    setPersistedThumbnailKey("");
    if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
  }

  function selectFile(nextFile: File | undefined) {
    if (!nextFile) return;
    const type = fileType(nextFile);
    setError("");
    setMessage("");
    if (!type) {
      clearFile();
      setStage("error");
      setError("Unsupported video format. Please select an MP4, WebM, MOV, or MKV video.");
      return;
    }
    setFile(nextFile);
    setStage("ready");
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
  }

  function onDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setDragging(false);
    if (!busy) selectFile(event.dataTransfer.files[0]);
  }

  async function startUpload(event: FormEvent) {
    event.preventDefault();
    if (inFlightRef.current) return;
    if (!file) return setError("Select a video before uploading.");
    if (!title.trim()) return setError("Add a title before uploading your video.");

    const contentType = fileType(file);
    if (!contentType) return setError("Unsupported video format. Please select a supported video file.");
    setError("");
    setMessage("");
    setProgress(0);
    inFlightRef.current = true;
    let currentOperation: UploadStage = "validating";
    try {
      setStage("validating");
      let uploadVideoId = videoId;
      if (!uploadVideoId) {
        currentOperation = "creating-video";
        setStage(currentOperation);
        const draft = await createCreatorDraftVideo({ title, description, visibility });
        uploadVideoId = draft.id;
        setVideoId(draft.id);
      }
      await updateCreatorVideo(uploadVideoId, { title, description, visibility });
      if (thumbnail) {
        currentOperation = "thumbnail";
        setStage(currentOperation);
        const thumbnailUpload = await createThumbnailUpload(uploadVideoId, { contentType: thumbnailType(thumbnail) ?? thumbnail.type, fileSize: thumbnail.size });
        await uploadWithProgress(thumbnailUpload.uploadUrl, thumbnail, () => undefined);
        await completeThumbnailUpload(uploadVideoId, thumbnailUpload.key);
        setPersistedThumbnailKey(thumbnailUpload.key);
      }
      currentOperation = "creating-session";
      setStage(currentOperation);
      const session = await createUploadSession({ filename: file.name, fileSize: file.size, contentType, videoId: uploadVideoId });
      currentOperation = "uploading";
      setStage("uploading");
      await uploadWithProgress(session.uploadUrl, file, setProgress);
      currentOperation = "verifying";
      setStage("verifying");
      const completed = await completeUploadSession(session.uploadId, await digestFile(file));
      currentOperation = "processing";
      setStage("processing");
      setMessage("Your video has been uploaded and processing has started.");

      for (let attempt = 0; attempt < 20; attempt += 1) {
        let updatedDashboard;
        try {
          updatedDashboard = await getCreatorDashboard();
        } catch {
          break;
        }
          const uploadedVideo = updatedDashboard.videos.find((video) => video.id === uploadVideoId);
        if (uploadedVideo?.creatorStatus === "READY" || uploadedVideo?.status === "READY") {
          setStage("complete");
          setMessage("Video uploaded successfully and is ready to publish.");
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
      }
      setStage("queued");
      setMessage("Video uploaded successfully. Processing has started and will continue in the background.");
    } catch (uploadError) {
      setStage("error");
      const detail = uploadError instanceof Error ? uploadError.message : "";
      setError(detail.toLowerCase().includes("bearer") || detail.toLowerCase().includes("session")
        ? "Your session has expired. Please sign in again."
        : detail.toLowerCase().includes("permission") || detail.toLowerCase().includes("creator")
          ? "You don't have permission to upload videos."
          : currentOperation === "creating-video"
            ? "Unable to create your video. Please try again."
            : currentOperation === "creating-session"
              ? "Unable to prepare your upload. Please try again."
              : currentOperation === "uploading"
                ? "Video upload failed. Please retry."
                : currentOperation === "verifying"
                  ? "We couldn't verify your upload. Please retry."
                  : currentOperation === "thumbnail"
                    ? "Thumbnail upload failed. You can retry or continue without a custom thumbnail."
                    : "Something went wrong. Please try again.");
    } finally {
      inFlightRef.current = false;
    }
  }

  const isComplete = stage === "queued" || stage === "complete";

  return <AppShell active="/studio/upload" eyebrow="Creator Studio" title="Upload video">
    <form className="studio-upload-page" onSubmit={startUpload}>
      <header className="studio-upload-header">
        <div><p className="studio-upload-kicker">Creator Studio / Upload</p><h1>Upload video</h1><p>Share your next video with your audience.</p></div>
      </header>

      <section className="studio-upload-section studio-upload-hero-section" aria-labelledby="upload-video-heading">
        <div className="studio-upload-section-heading"><div><h2 id="upload-video-heading">Upload your video</h2><p>Start with a video file from your computer.</p></div><span className="studio-upload-step">01</span></div>
        <input ref={inputRef} className="studio-upload-hidden-input" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv" onChange={onFileChange} />
        {!file ? <button className={`studio-upload-dropzone ${dragging ? "is-dragging" : ""}`} type="button" onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); setDragging(true); }} onDragOver={(event) => event.preventDefault()} onDragLeave={() => setDragging(false)} onDrop={onDrop} disabled={busy}>
          <span className="studio-upload-icon" aria-hidden="true">↑</span><strong>Upload your video</strong><span>Drag and drop your video here</span><small>or</small><span className="studio-upload-select">Select video</span><small>MP4, WebM, MOV, and MKV</small>
        </button> : <div className="studio-upload-selected"><div className="studio-upload-video-frame">{previewUrl ? <video src={previewUrl} controls preload="metadata" onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)} /> : null}<span className="studio-upload-duration">{duration && Number.isFinite(duration) ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}` : "Preview"}</span></div><div className="studio-upload-selected-meta"><div><strong>{file.name}</strong><span>{formatBytes(file.size)} · {(fileType(file) ?? "video").replace("video/", "").toUpperCase()}</span></div><div className="studio-upload-selected-actions"><button type="button" onClick={() => inputRef.current?.click()} disabled={busy}>Change video</button><button type="button" onClick={clearFile} disabled={busy}>Remove</button></div></div></div>}
      </section>

      <div className="studio-upload-grid">
        <div className="studio-upload-main-column">
          <section className="studio-upload-section" aria-labelledby="details-heading"><div className="studio-upload-section-heading"><div><h2 id="details-heading">Video details</h2><p>Tell viewers what your video is about.</p></div><span className="studio-upload-step">02</span></div><label className="studio-upload-field">Title *<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a title that describes your video" disabled={busy} /><span>{title.length} / 100</span></label><label className="studio-upload-field">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell viewers about your video" rows={6} disabled={busy} /><span>{description.length} characters</span></label></section>
          <section className="studio-upload-section" aria-labelledby="thumbnail-heading"><div className="studio-upload-section-heading"><div><h2 id="thumbnail-heading">Thumbnail</h2><p>Choose a thumbnail that represents your video.</p></div><span className="studio-upload-step">03</span></div><input ref={thumbnailInputRef} id="studio-thumbnail-file" className="studio-upload-thumbnail-input" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => selectThumbnail(event.target.files?.[0])} disabled={busy} /><label htmlFor="studio-thumbnail-file" className="studio-upload-thumbnail-picker"><span>+</span><strong>{thumbnailPreview ? "Change thumbnail" : "Upload thumbnail"}</strong><small>JPEG, PNG, or WebP · Up to 10 MB</small></label>{thumbnailPreview ? <div className="studio-upload-thumbnail-selected"><img src={thumbnailPreview} alt="Selected thumbnail preview" /><div><strong>{thumbnail?.name}</strong><span>{thumbnail ? formatBytes(thumbnail.size) : ""}</span></div><button type="button" onClick={() => void removeThumbnail()} disabled={busy}>Remove</button></div> : null}</section>
          <section className="studio-upload-section" aria-labelledby="visibility-heading"><div className="studio-upload-section-heading"><div><h2 id="visibility-heading">Visibility</h2><p>Choose who can watch your video.</p></div><span className="studio-upload-step">04</span></div><div className="studio-upload-visibility-options">{([['PUBLIC', 'Public', 'Anyone can watch'], ['UNLISTED', 'Unlisted', 'Anyone with the link can watch'], ['PRIVATE', 'Private', 'Only you can watch']] as const).map(([value, label, detail]) => <label className={`studio-upload-visibility-option ${visibility === value ? "is-selected" : ""}`} key={value}><input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} disabled={busy} /><span><strong>{label}</strong><small>{detail}</small></span></label>)}</div></section>
        </div>
        <aside className="studio-upload-side-column"><section className="studio-upload-preview-card"><div className="studio-upload-section-heading"><div><h2>Video preview</h2></div></div><div className="studio-upload-preview">{previewUrl ? <video src={previewUrl} controls preload="metadata" /> : <span>Select a video to preview it.</span>}</div>{file ? <div className="studio-upload-preview-meta"><strong>{file.name}</strong><span>{`${formatBytes(file.size)} · ${(fileType(file) ?? "video").replace("video/", "").toUpperCase()}`}</span></div> : null}</section></aside>
      </div>

      <section className={`studio-upload-status studio-upload-status--${stage}`} aria-live="polite"><div className="studio-upload-status-copy"><span className="studio-upload-status-dot" /><div><strong>{stageLabels[stage]}</strong><p>{stage === "idle" ? "Choose a video file to begin." : stage === "ready" ? "Your video is ready to upload." : stage === "validating" ? "Checking your video and details..." : stage === "creating-video" ? "Preparing your video details..." : stage === "thumbnail" ? "Uploading your selected thumbnail..." : stage === "creating-session" ? "Preparing your video upload..." : stage === "uploading" ? `${progress}% complete · ${file?.name ?? ""}` : stage === "verifying" ? "Checking your uploaded video..." : stage === "processing" || stage === "queued" ? "Video uploaded. Processing has started." : stage === "complete" ? "Your video is uploaded and ready to publish." : stage === "error" ? "We couldn't complete your upload." : message}</p></div></div>{stage === "uploading" ? <div className="studio-upload-progress"><span style={{ width: `${progress}%` }} /></div> : null}</section>
      {error ? <p className="studio-upload-error" role="alert">{error}</p> : null}
      <footer className="studio-upload-actions">{isComplete ? <><Link className="studio-upload-cancel" href="/studio/content">View content</Link><button className="studio-upload-submit" type="button" onClick={startAnotherUpload}>Upload another video</button></> : <><button className="studio-upload-cancel" type="button" onClick={startAnotherUpload} disabled={busy}>Cancel</button><button className="studio-upload-submit" type="submit" disabled={busy || !file || !title.trim()}>{busy ? stage === "uploading" ? "Uploading..." : stage === "verifying" ? "Verifying..." : stage === "processing" ? "Processing..." : stage === "thumbnail" ? "Uploading thumbnail..." : "Preparing..." : "Upload video"}</button></>}</footer>
    </form>
  </AppShell>;
}
