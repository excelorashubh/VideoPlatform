"use client";

import { useEffect, useState } from "react";
import { Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { getChannelSubscription, getStoredSessionToken, getVideoEngagement, getVideoReaction, reactToVideo, removeVideoReaction, subscribeToChannel, unsubscribeFromChannel, type ChannelSubscriptionState, type PublicVideo, type VideoEngagement, type VideoReaction } from "../../../lib/api";

function requireAuth(videoId: string) {
  if (getStoredSessionToken()) return true;
  window.location.href = `/auth?next=${encodeURIComponent(`/watch/${videoId}`)}`;
  return false;
}

export function WatchEngagement({ videoId, channel }: { videoId: string; channel: PublicVideo["creator"] }) {
  const [reactionState, setReactionState] = useState<VideoReaction | null>(null);
  const [subscriptionState, setSubscriptionState] = useState<ChannelSubscriptionState | null>(null);
  const [reactionPending, setReactionPending] = useState(false);
  const [subscriptionPending, setSubscriptionPending] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const engagement: VideoEngagement = await getVideoEngagement(videoId);
        if (cancelled) return;
        setReactionState({ likeCount: engagement.likeCount, dislikeCount: engagement.dislikeCount, viewerReaction: engagement.viewerReaction });
        setSubscriptionState({ subscribed: engagement.viewerSubscribed, subscriberCount: engagement.subscriberCount });
        if (!getStoredSessionToken()) return;

        const [reaction, subscription] = await Promise.all([
          getVideoReaction(videoId),
          getChannelSubscription(channel.channelId)
        ]);
        if (cancelled) return;
        setReactionState((current) => current ? { ...current, viewerReaction: reaction.viewerReaction } : current);
        setSubscriptionState(subscription);
      } catch {
        if (!cancelled) setNotice("Engagement is temporarily unavailable.");
      }
    })();
    return () => { cancelled = true; };
  }, [channel.channelId, videoId]);

  async function react(type: "LIKE" | "DISLIKE") {
    if (!requireAuth(videoId) || reactionPending) return;
    setReactionPending(true);
    setNotice("");
    try {
      const response = reactionState?.viewerReaction === type
        ? await removeVideoReaction(videoId)
        : await reactToVideo(videoId, type);
      setReactionState(response);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't update reaction.");
    } finally {
      setReactionPending(false);
    }
  }

  async function subscribe() {
    if (!requireAuth(videoId) || subscriptionPending || !subscriptionState) return;
    setSubscriptionPending(true);
    setNotice("");
    try {
      const response = subscriptionState.subscribed
        ? await unsubscribeFromChannel(channel.channelId)
        : await subscribeToChannel(channel.channelId);
      setSubscriptionState(response);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Couldn't update subscription.");
    } finally {
      setSubscriptionPending(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}/watch/${videoId}`;
    try {
      if (navigator.share) await navigator.share({ title: "Watch this video on GVP", url });
      else {
        await navigator.clipboard.writeText(url);
        setNotice("Link copied");
        window.setTimeout(() => setNotice(""), 2200);
      }
    } catch {
      setNotice("Unable to share this video.");
    }
  }

  const viewerReaction = reactionState?.viewerReaction ?? null;
  const viewerSubscribed = subscriptionState?.subscribed ?? false;
  const subscriptionLabel = viewerSubscribed ? `Unsubscribe from ${channel.name}` : `Subscribe to ${channel.name}`;

  return <div className="watch-channel-row">
    <div className="watch-channel-identity">
      <a className="watch-avatar" href={`/channel/${channel.handle}`} aria-label={`${channel.name} channel`}>
        {channel.avatarUrl ? <img src={channel.avatarUrl} alt="" /> : channel.name.slice(0, 1).toUpperCase()}
      </a>
      <div className="watch-channel-copy">
        <strong>{channel.name}</strong>
        <span>@{channel.handle}</span>
        <small>{subscriptionState ? `${subscriptionState.subscriberCount} ${subscriptionState.subscriberCount === 1 ? "subscriber" : "subscribers"}` : "Loading subscribers..."}</small>
      </div>
    </div>
    <div className="watch-engagement" role="group" aria-label="Video actions">
      <button type="button" className={`watch-action-button watch-reaction-button${viewerReaction === "LIKE" ? " is-selected" : ""}`} onClick={() => void react("LIKE")} disabled={reactionPending || !reactionState} aria-label="Like this video" aria-pressed={viewerReaction === "LIKE"} title="Like this video">
        <ThumbsUp size={18} aria-hidden="true" /><span>{reactionState?.likeCount ?? "..."}</span>
      </button>
      <button type="button" className={`watch-action-button watch-reaction-button${viewerReaction === "DISLIKE" ? " is-selected" : ""}`} onClick={() => void react("DISLIKE")} disabled={reactionPending || !reactionState} aria-label="Dislike this video" aria-pressed={viewerReaction === "DISLIKE"} title="Dislike this video">
        <ThumbsDown size={18} aria-hidden="true" /><span>{reactionState?.dislikeCount ?? "..."}</span>
      </button>
      <button type="button" className="watch-action-button watch-share-button" onClick={() => void share()} aria-label="Share" title="Share this video">
        <Share2 size={18} aria-hidden="true" /><span>Share</span>
      </button>
      <button type="button" className={`watch-action-button watch-subscribe-button${viewerSubscribed ? " is-subscribed" : ""}`} onClick={() => void subscribe()} disabled={subscriptionPending || !subscriptionState} aria-label={subscriptionLabel} aria-pressed={viewerSubscribed}>
        {viewerSubscribed ? "Subscribed" : "Subscribe"}
      </button>
    </div>
    {notice ? <p className="watch-action-notice" role="status">{notice}</p> : null}
  </div>;
}
