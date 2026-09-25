import { AppShell, PageHeading } from "../_components/AppShell";

export default function ClipsPage() {
  return <AppShell title="Clips"><PageHeading eyebrow="Your highlights" title="Moments worth keeping" action="Create a clip" /><div className="clip-list">{["The sentence that stayed with me", "A perfect explanation in 42 seconds", "The live session turns a corner"].map((title, index) => <article className="clip-row" key={title}><div className={`clip-art tone-${index + 1}`}><span>0:{42 + index * 9}</span></div><div><p className="card-label">From a GVP Editorial video</p><h3>{title}</h3><p className="muted">Created by you · {index + 1} day{index ? "s" : ""} ago</p></div><button className="text-link">Share</button></article>)}</div></AppShell>;
}
