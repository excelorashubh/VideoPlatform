"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Reply, Search, Trash2 } from "lucide-react";
import { createVideoComment, deleteCreatorComment, getCreatorComments, type CreatorCommentsResponse, type CreatorManagedComment } from "../../../lib/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function CreatorCommentsDashboard() {
  const [data, setData] = useState<CreatorCommentsResponse | null>(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const [videoId, setVideoId] = useState("");
  const [page, setPage] = useState(1);
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchText.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getCreatorComments({ page, search, videoId: videoId || undefined }).then((result) => {
      if (!cancelled) setData(result);
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load comments.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, reloadKey, search, videoId]);

  async function replyTo(comment: CreatorManagedComment) {
    if (!replyBody.trim() || busy) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await createVideoComment(comment.videoId, replyBody, comment.id);
      setReplyBody("");
      setReplyId(null);
      setNotice("Reply posted.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to post reply.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(comment: CreatorManagedComment) {
    if (!window.confirm("Delete this comment from your video?")) return;
    setBusy(true);
    setError(null);
    setNotice("");
    try {
      await deleteCreatorComment(comment.id);
      setNotice("Comment deleted.");
      setReloadKey((key) => key + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete comment.");
    } finally {
      setBusy(false);
    }
  }

  const comments = data?.items ?? [];

  return <main className="creator-comments-page">
    <header className="creator-section-header"><div><p className="creator-studio-eyebrow">Audience</p><h1>Comments</h1><p>Review and reply to comments on your videos.</p></div><span className="creator-comments-count">{data ? `${data.total} comments` : ""}</span></header>
    <section className="creator-comments-toolbar" aria-label="Comment filters"><label className="creator-comments-search"><Search size={16} aria-hidden="true" /><input type="search" value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search comments" aria-label="Search comments" /></label><label className="creator-comments-video-filter"><span>Video</span><select value={videoId} onChange={(event) => { setVideoId(event.target.value); setPage(1); }} aria-label="Filter comments by video"><option value="">All videos</option>{data?.videos.map((video) => <option value={video.id} key={video.id}>{video.title}</option>)}</select></label><span className="creator-comments-status-note">Published comments · moderation queues aren&apos;t supported</span></section>
    {error ? <div className="creator-page-error" role="alert"><span>{error}</span><button type="button" className="creator-secondary-button" onClick={() => setReloadKey((key) => key + 1)}>Retry</button></div> : null}
    {notice ? <p className="creator-page-notice" role="status">{notice}</p> : null}
    {loading && !data ? <div className="creator-comments-skeleton" aria-label="Loading comments" aria-busy="true">{[0, 1, 2].map((item) => <div key={item} />)}</div> : loading ? <p className="creator-comments-refresh" role="status">Updating comments...</p> : null}
    {!loading && comments.length ? <section className="creator-comments-list" aria-label="Published comments">{comments.map((comment) => <article className="creator-managed-comment" key={comment.id}>
      <span className="creator-comment-avatar" aria-hidden="true">{comment.author.displayName.slice(0, 1).toUpperCase()}</span>
      <div className="creator-managed-comment-main"><div className="creator-comment-meta"><strong>{comment.author.displayName}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time><span>on <a href={`/watch/${comment.video.id}`}>{comment.video.title}</a></span></div><p>{comment.body || "Comment deleted"}</p>{comment.replyCount ? <small>{comment.replyCount} {comment.replyCount === 1 ? "reply" : "replies"}</small> : null}
        {replyId === comment.id ? <form className="creator-comment-reply-form" onSubmit={(event) => { event.preventDefault(); void replyTo(comment); }}><textarea value={replyBody} onChange={(event) => setReplyBody(event.target.value)} maxLength={2000} rows={3} placeholder="Write a reply..." aria-label={`Reply to ${comment.author.displayName}`} /><div><button type="button" className="creator-secondary-button" onClick={() => { setReplyId(null); setReplyBody(""); }} disabled={busy}>Cancel</button><button type="submit" className="creator-studio-primary" disabled={busy || !replyBody.trim()}>{busy ? "Posting..." : "Reply"}</button></div></form> : null}
      </div>
      <div className="creator-comment-actions"><button type="button" className="creator-secondary-button" onClick={() => { setReplyId(replyId === comment.id ? null : comment.id); setError(null); }}><Reply size={15} aria-hidden="true" /> Reply</button><button type="button" className="creator-icon-button is-danger" title="Delete comment" aria-label={`Delete comment from ${comment.author.displayName}`} disabled={busy} onClick={() => void remove(comment)}><Trash2 size={16} /></button></div>
    </article>)}</section> : null}
    {!loading && !comments.length && !error ? <section className="creator-feature-empty"><span className="creator-feature-empty-icon"><MessageCircle size={22} aria-hidden="true" /></span><h2>No comments to show</h2><p>Comments on your videos will appear here.</p></section> : null}
    {data && data.total > data.pageSize ? <nav className="creator-comments-pagination" aria-label="Comment pages"><button type="button" className="creator-secondary-button" disabled={page <= 1 || loading} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span>Page {page} of {Math.ceil(data.total / data.pageSize)}</span><button type="button" className="creator-secondary-button" disabled={!data.hasMore || loading} onClick={() => setPage((value) => value + 1)}>Next</button></nav> : null}
  </main>;
}