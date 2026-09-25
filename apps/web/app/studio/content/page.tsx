import { AppShell, PageHeading } from "../../_components/AppShell";

export default function StudioContentPage() {
  return <AppShell active="/studio/content" eyebrow="Creator Studio" title="Content library"><PageHeading eyebrow="Your work" title="Videos" action="Upload video" /><div className="table-panel"><div className="table-row table-head"><span>Title</span><span>Status</span><span>Visibility</span><span>Views</span></div>{["The quiet architecture of good systems", "Field notes from a moving planet", "How sound becomes a place"].map((title, index) => <div className="table-row" key={title}><div className="title-cell"><div className={`mini-thumb tone-${index + 1}`} /><strong>{title}</strong></div><span className={index === 1 ? "status warm" : "status"}>{index === 1 ? "Processing" : "Published"}</span><span>{index === 2 ? "Unlisted" : "Public"}</span><span>{index === 0 ? "12.4k" : index === 1 ? "--" : "8.1k"}</span></div>)}</div></AppShell>;
}
