import { AppShell, PageHeading } from "../../_components/AppShell";

export default function StudioCommentsPage() {
  return <AppShell active="/studio/comments" eyebrow="Creator Studio" title="Comments"><PageHeading eyebrow="Community" title="Keep the conversation moving" action="Filter" /><div className="comment-list">{["This changed how I think about systems.", "The pacing on this one is excellent.", "Would love a follow-up on the field notes."].map((comment, index) => <article className="comment-row" key={comment}><div className="comment-avatar">{String.fromCharCode(65 + index)}</div><div><strong>{comment}</strong><p className="muted">Viewer {index + 1} · on {index === 0 ? "The quiet architecture of good systems" : "Field notes from a moving planet"}</p><button className="text-link">Reply</button></div></article>)}</div></AppShell>;
}
