"use client";

import { useEffect, useState } from "react";
import { createVideoComment, deleteVideoComment, getStoredSessionToken, getVideoComments, type VideoComment } from "../../../lib/api";

export function CommentsSection({ videoId }: { videoId: string }) {
  const [comments, setComments] = useState<VideoComment[]>([]);
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function load() { setLoading(true); try { setComments(await getVideoComments(videoId)); } catch { setError("Couldn't load comments."); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, [videoId]);

  async function submit() {
    if (!getStoredSessionToken()) { window.location.href = `/auth?next=${encodeURIComponent(`/watch/${videoId}`)}`; return; }
    if (!body.trim() || sending) return;
    setSending(true); setError("");
    try { const comment = await createVideoComment(videoId, body, replyTo ?? undefined); setComments((current) => [comment, ...current]); setBody(""); setReplyTo(null); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Couldn't post your comment."); }
    finally { setSending(false); }
  }

  async function remove(id: string) { try { await deleteVideoComment(id); setComments((current) => current.filter((comment) => comment.id !== id)); } catch { setError("Couldn't delete this comment."); } }

  return <section className="watch-comments"><div className="watch-section-heading"><h2>Comments {comments.length ? comments.length : ""}</h2><span>Join the conversation</span></div><div className="watch-comment-box">{replyTo ? <span className="watch-replying">Replying to comment <button type="button" onClick={() => setReplyTo(null)}>Cancel</button></span> : null}<input aria-label={replyTo ? "Add a reply" : "Add a comment"} placeholder={replyTo ? "Add a reply..." : "Add a comment..."} value={body} onChange={(event) => setBody(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) void submit(); }} /><button type="button" onClick={() => void submit()} disabled={sending || !body.trim()}>{sending ? "Posting..." : replyTo ? "Reply" : "Comment"}</button></div>{error ? <p className="auth-error" role="alert">{error}</p> : null}{loading ? <p className="muted">Loading comments...</p> : comments.length ? <div className="watch-comment-list">{comments.map((comment) => <article className={`watch-comment ${comment.parentId ? "watch-comment-reply" : ""}`} key={comment.id}><div className="watch-avatar">{comment.author.displayName.slice(0, 1).toUpperCase()}</div><div><strong>{comment.author.displayName}</strong><p>{comment.body || "Comment deleted"}</p><div className="watch-comment-actions"><button type="button" onClick={() => setReplyTo(comment.id)}>Reply</button>{getStoredSessionToken() ? <button type="button" className="watch-comment-delete" onClick={() => void remove(comment.id)}>Delete</button> : null}</div></div></article>)}</div> : <p className="watch-empty-comments">No comments yet. Be the first to comment.</p>}</section>;
}
