"use client";

import { useEffect, useState } from "react";
import { getChannelSubscription, getStoredSessionToken, getVideoEngagement, getVideoReaction, reactToVideo, removeVideoReaction, subscribeToChannel, unsubscribeFromChannel, type VideoEngagement } from "../../../lib/api";

function requireAuth(videoId: string) {
  if (getStoredSessionToken()) return true;
  window.location.href = `/auth?next=${encodeURIComponent(`/watch/${videoId}`)}`;
  return false;
}

export function WatchEngagement({ videoId, channelId }: { videoId: string; channelId: string }) {
  const [state, setState] = useState<VideoEngagement | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => { void (async () => { try { const engagement = await getVideoEngagement(videoId); if (!getStoredSessionToken()) return setState(engagement); const [reaction, subscription] = await Promise.all([getVideoReaction(videoId), getChannelSubscription(channelId)]); setState({ ...engagement, viewerReaction: reaction.viewerReaction, viewerSubscribed: subscription.subscribed, subscriberCount: subscription.subscriberCount }); } catch { setNotice("Engagement is temporarily unavailable."); } })(); }, [channelId, videoId]);

  async function react(type: "LIKE" | "DISLIKE") {
    if (!requireAuth(videoId) || busy) return;
    setBusy(true); setNotice("");
    try { setState(await (state?.viewerReaction === type ? removeVideoReaction(videoId) : reactToVideo(videoId, type))); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Couldn't update reaction."); }
    finally { setBusy(false); }
  }

  async function subscribe() {
    if (!requireAuth(videoId) || busy || !state) return;
    setBusy(true); setNotice("");
    try { const result = state.viewerSubscribed ? await unsubscribeFromChannel(channelId) : await subscribeToChannel(channelId); setState({ ...state, ...result }); }
    catch (error) { setNotice(error instanceof Error ? error.message : "Couldn't update subscription."); }
    finally { setBusy(false); }
  }

  async function share() {
    const url = `${window.location.origin}/watch/${videoId}`;
    try { if (navigator.share) await navigator.share({ title: "Watch this video on GVP", url }); else { await navigator.clipboard.writeText(url); setNotice("Link copied"); window.setTimeout(() => setNotice(""), 2200); } }
    catch { setNotice("Unable to share this video."); }
  }

  return <><div className="watch-engagement"><button type="button" onClick={() => void react("LIKE")} disabled={busy} aria-label="Like video" className={state?.viewerReaction === "LIKE" ? "is-selected" : ""}>Like {state?.likeCount ?? 0}</button><button type="button" onClick={() => void react("DISLIKE")} disabled={busy} aria-label="Dislike video" className={state?.viewerReaction === "DISLIKE" ? "is-selected" : ""}>Dislike {state?.dislikeCount ?? 0}</button><button type="button" onClick={() => void share()} aria-label="Share video">Share</button><button type="button" onClick={() => void subscribe()} disabled={busy || !state} aria-label="Subscribe to channel">{state?.viewerSubscribed ? "Subscribed" : "Subscribe"} · {state?.subscriberCount ?? 0}</button></div>{notice ? <p className="watch-action-notice" role="status">{notice}</p> : null}</>;
}
