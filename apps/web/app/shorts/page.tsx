import { AppShell } from "../_components/AppShell";

const shorts = ["A one-minute reset for your attention", "The shape of a good question", "Three details from the night market", "What makes a room feel alive"];
export default function ShortsPage() {
  return <AppShell title="Shorts"><div className="shorts-intro"><div><p className="kicker">Fast signals</p><h2>Small screen,<br />big feeling.</h2></div><p>Quick ideas and moments from the channels you follow.</p></div><div className="shorts-grid">{shorts.map((title, index) => <article className="short-card" key={title}><div className={`short-art tone-${(index % 3) + 1}`}><span>0:{38 + index * 4}</span></div><div className="short-body"><strong>{title}</strong><small>@gvp-editorial · {index + 1}.2k views</small></div></article>)}</div></AppShell>;
}
