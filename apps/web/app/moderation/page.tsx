import { AppShell, PageHeading } from "../_components/AppShell";

export default function ModerationPage() {
  return <AppShell eyebrow="Trust and safety" title="Moderation queue"><PageHeading eyebrow="Needs attention" title="Review reports" action="Filter queue" /><div className="table-panel"><div className="table-row table-head"><span>Report</span><span>Reason</span><span>Priority</span><span>Action</span></div>{["Comment on Architecture walk-through", "Channel: quick-buck tutorials", "Clip with unlicensed audio"].map((item, index) => <div className="table-row" key={item}><span>{item}</span><span>{index === 0 ? "Harassment" : index === 1 ? "Spam" : "Copyright"}</span><span className={index === 0 ? "status warm" : "status"}>{index === 0 ? "High" : "Normal"}</span><button className="text-link">Review</button></div>)}</div></AppShell>;
}
