import { AppShell, PageHeading } from "../_components/AppShell";

export default function PostsPage() {
  return <AppShell title="Community posts"><PageHeading eyebrow="From your channels" title="The conversation around the work" action="Following" /><div className="post-feed">{["We are taking the long way through the next episode. What are you curious about?", "New upload is live. It is about the quiet decisions that make a system hold together.", "A small note from the edit room: leave space for the useful surprise."].map((body, index) => <article className="post-card" key={body}><div className="post-header"><div className="channel-avatar">G</div><div><strong>GVP Editorial</strong><span>@gvp-editorial · {index + 1}h</span></div></div><p>{body}</p><div className="post-actions"><button>Like</button><button>Comment</button><button>Share</button></div></article>)}</div></AppShell>;
}
