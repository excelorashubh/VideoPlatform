import { AppShell, PageHeading } from "../../_components/AppShell";

export default function CopyrightPage() {
  return <AppShell active="/studio/copyright" eyebrow="Creator Studio" title="Copyright"><PageHeading eyebrow="Protection" title="Keep your work yours" action="Learn more" /><div className="copyright-status"><div className="status-icon">OK</div><div><h3>No active claims</h3><p className="muted">Your published videos are currently clear of copyright matches.</p></div></div><div className="table-panel copyright-table"><div className="table-row table-head"><span>Video</span><span>Scan</span><span>Result</span></div>{["The quiet architecture of good systems", "Field notes from a moving planet"].map((title) => <div className="table-row" key={title}><span>{title}</span><span>Completed today</span><span className="status">Clear</span></div>)}</div></AppShell>;
}
