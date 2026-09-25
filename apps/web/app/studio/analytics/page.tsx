import { AppShell, PageHeading } from "../../_components/AppShell";

export default function StudioAnalyticsPage() {
  return <AppShell active="/studio/analytics" eyebrow="Creator Studio" title="Analytics"><PageHeading eyebrow="Performance" title="Audience signals" action="Last 28 days" /><div className="chart-panel"><div className="chart-label"><span>Views</span><strong>48,204</strong></div><div className="chart-bars">{[42, 58, 44, 70, 64, 82, 68, 92, 76, 88, 100, 84].map((height, index) => <i style={{ height: `${height}%` }} key={index} />)}</div><div className="chart-axis"><span>Aug 19</span><span>Aug 26</span><span>Sep 02</span><span>Sep 09</span></div></div><div className="metric-grid compact"><article className="metric"><span>Average view duration</span><strong>06:42</strong><small>↑ 12 seconds</small></article><article className="metric"><span>Click-through rate</span><strong>6.8%</strong><small>↑ 0.4 points</small></article></div></AppShell>;
}
