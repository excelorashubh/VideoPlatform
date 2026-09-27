"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Activity, Eye, MessageCircle, ThumbsUp, TrendingDown, TrendingUp, Users, type LucideIcon } from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { getCreatorAnalytics, getStoredSessionToken, type CreatorAnalyticsRange, type CreatorAnalyticsResponse, type CreatorAnalyticsSort } from "../../../lib/api";

const rangeOptions: Array<{ value: CreatorAnalyticsRange; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "28d", label: "Last 28 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "365d", label: "Last 365 days" },
  { value: "lifetime", label: "Lifetime" }
];

const chartMetrics = [
  { value: "views", label: "Views", color: "#d96d4f" },
  { value: "subscriptions", label: "Subscriptions", color: "#318c78" },
  { value: "likes", label: "Likes", color: "#b78636" },
  { value: "comments", label: "Comments", color: "#6579b8" }
] as const;

type ChartMetric = (typeof chartMetrics)[number]["value"];

function numberFormat(value: number) {
  return new Intl.NumberFormat("en", { maximumFractionDigits: 0 }).format(value);
}

function periodLabel(value: string, range: CreatorAnalyticsRange) {
  const date = new Date(range === "lifetime" ? `${value}-01T00:00:00Z` : `${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en", range === "lifetime" ? { month: "short", year: "numeric", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" }).format(date);
}

function formatDelta(current: number, previous: number | undefined) {
  if (previous === undefined || previous === 0) return { text: "No previous-period comparison", trend: "none" as const };
  const percentage = Math.round(((current - previous) / previous) * 100);
  return { text: `${percentage > 0 ? "+" : ""}${percentage}% vs previous period`, trend: percentage > 0 ? "up" as const : percentage < 0 ? "down" as const : "flat" as const };
}

function MetricCard({ label, value, icon: Icon, previous, detail }: { label: string; value: number; icon: LucideIcon; previous?: number; detail?: string }) {
  const delta = previous === undefined ? null : formatDelta(value, previous);
  return <article className="creator-analytics-metric">
    <div className="creator-analytics-metric-top"><span>{label}</span><Icon size={18} aria-hidden="true" /></div>
    <strong>{numberFormat(value)}</strong>
    {delta ? <small className={`creator-analytics-delta is-${delta.trend}`}>{delta.trend === "up" ? <TrendingUp size={13} aria-hidden="true" /> : delta.trend === "down" ? <TrendingDown size={13} aria-hidden="true" /> : null}{delta.text}</small> : <small>{detail}</small>}
  </article>;
}

function AnalyticsSkeleton() {
  return <div className="creator-analytics-skeleton" aria-label="Loading analytics" aria-busy="true">
    <div className="creator-analytics-skeleton-header" />
    <div className="creator-analytics-metric-grid">{[0, 1, 2, 3].map((item) => <div className="creator-analytics-skeleton-metric" key={item} />)}</div>
    <div className="creator-analytics-skeleton-chart" />
  </div>;
}

function AnalyticsChart({ data, metric, range }: { data: CreatorAnalyticsResponse; metric: ChartMetric; range: CreatorAnalyticsRange }) {
  const selected = chartMetrics.find((item) => item.value === metric) ?? chartMetrics[0];
  return <div className="creator-analytics-chart-wrap">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data.series} margin={{ top: 12, right: 12, left: 0, bottom: 0 }}>
        <defs><linearGradient id="creatorAnalyticsFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={selected.color} stopOpacity={0.24} /><stop offset="100%" stopColor={selected.color} stopOpacity={0.015} /></linearGradient></defs>
        <CartesianGrid vertical={false} stroke="var(--studio-border)" strokeDasharray="3 5" />
        <XAxis dataKey="date" tickFormatter={(value: string) => periodLabel(value, range)} tickLine={false} axisLine={false} minTickGap={28} />
        <YAxis tickFormatter={(value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k` : String(value)} tickLine={false} axisLine={false} width={42} allowDecimals={false} />
        <Tooltip labelFormatter={(value) => periodLabel(String(value), range)} formatter={(value) => [numberFormat(Number(value ?? 0)), selected.label]} contentStyle={{ border: "1px solid var(--studio-border)", borderRadius: 8, background: "var(--studio-surface)", color: "var(--studio-text)" }} />
        <Area type="monotone" dataKey={metric} stroke={selected.color} strokeWidth={2.5} fill="url(#creatorAnalyticsFill)" activeDot={{ r: 4 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>;
}

export function CreatorAnalyticsDashboard() {
  const router = useRouter();
  const [range, setRange] = useState<CreatorAnalyticsRange>("28d");
  const [sortBy, setSortBy] = useState<CreatorAnalyticsSort>("views");
  const [metric, setMetric] = useState<ChartMetric>("views");
  const [data, setData] = useState<CreatorAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const hasLoaded = useRef(false);
  const requestRef = useRef<{ key: string; promise: Promise<CreatorAnalyticsResponse> } | null>(null);

  useEffect(() => {
    if (!getStoredSessionToken()) {
      router.replace("/auth?next=/creator/analytics");
      return;
    }
    let cancelled = false;
    setError(null);
    if (hasLoaded.current) setRefreshing(true);
    else setLoading(true);
    const key = `${range}:${sortBy}:${retryKey}`;
    if (!requestRef.current || requestRef.current.key !== key) {
      requestRef.current = { key, promise: getCreatorAnalytics(range, sortBy) };
    }
    void requestRef.current.promise.then((result) => {
      if (!cancelled) {
        setData(result);
        hasLoaded.current = true;
      }
    }).catch((requestError: unknown) => {
      if (!cancelled) setError(requestError instanceof Error ? requestError.message : "Unable to load analytics.");
    }).finally(() => {
      if (!cancelled) {
        setLoading(false);
        setRefreshing(false);
      }
    });
    return () => { cancelled = true; };
  }, [range, retryKey, router, sortBy]);

  if (loading && !data) return <AnalyticsSkeleton />;
  if (error && !data) return <section className="creator-analytics-error" role="alert"><h2>Unable to load analytics</h2><p>{error}</p><button type="button" onClick={() => setRetryKey((key) => key + 1)}>Retry</button></section>;
  if (!data) return null;

  const cards = [
    { label: "Views", value: data.overview.views, previous: data.previousPeriod?.views, icon: Eye },
    { label: "Likes", value: data.overview.likes, previous: data.previousPeriod?.likes, icon: ThumbsUp },
    { label: "Comments", value: data.overview.comments, previous: data.previousPeriod?.comments, icon: MessageCircle },
    { label: "Current subscribers", value: data.overview.subscribers, detail: `${numberFormat(data.overview.subscriptions)} active subscriptions started in range`, icon: Users }
  ];

  return <div className="creator-analytics-page">
    <header className="creator-analytics-header">
      <div><p className="creator-studio-eyebrow">Channel performance</p><h1>Analytics</h1><p>Track your channel performance, audience engagement, and content growth.</p></div>
      <div className="creator-analytics-header-controls"><label><span>Date range</span><select aria-label="Analytics date range" value={range} onChange={(event) => setRange(event.target.value as CreatorAnalyticsRange)}>{rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><Link href="/creator/upload" className="creator-studio-primary">Upload video</Link></div>
    </header>
    {refreshing ? <p className="creator-analytics-refresh" role="status">Updating analytics…</p> : null}
    {error ? <p className="creator-analytics-inline-error" role="alert">{error} <button type="button" onClick={() => setRetryKey((key) => key + 1)}>Retry</button></p> : null}
    {!data.hasActivity ? <section className="creator-analytics-empty"><span className="creator-analytics-empty-mark"><Eye size={22} aria-hidden="true" /></span><h2>Your channel doesn&apos;t have enough activity yet.</h2><p>Once viewers start watching and engaging with your videos, the available performance metrics will appear here.</p><Link href="/creator/upload" className="creator-studio-primary">Upload video</Link></section> : <>
      <section className="creator-analytics-overview" aria-label="Channel overview">
        <div className="creator-analytics-section-heading"><div><p className="creator-studio-eyebrow">Overview</p><h2>Channel overview</h2></div><span>{rangeOptions.find((option) => option.value === range)?.label}</span></div>
        <div className="creator-analytics-metric-grid">{cards.map((card) => <MetricCard key={card.label} {...card} />)}</div>
      </section>
      <section className="creator-analytics-chart-section">
        <div className="creator-analytics-section-heading"><div><p className="creator-studio-eyebrow">Performance</p><h2>Channel performance</h2></div><div className="creator-analytics-segment" role="group" aria-label="Chart metric">{chartMetrics.map((option) => <button type="button" key={option.value} className={metric === option.value ? "is-active" : ""} aria-pressed={metric === option.value} onClick={() => setMetric(option.value)}>{option.label}</button>)}</div></div>
        {data.series.length ? <AnalyticsChart data={data} metric={metric} range={range} /> : <p className="creator-analytics-chart-empty">No activity in this period.</p>}
        {metric === "subscriptions" ? <p className="creator-analytics-note">Subscription dates include currently active subscriptions only; unsubscribe history is not retained.</p> : null}
      </section>
      <div className="creator-analytics-secondary-grid">
        <section className="creator-analytics-list-section"><div className="creator-analytics-section-heading"><div><p className="creator-studio-eyebrow">Best performers</p><h2>Top content</h2></div><label className="creator-analytics-sort"><span>Sort by</span><select aria-label="Sort top content" value={sortBy} onChange={(event) => setSortBy(event.target.value as CreatorAnalyticsSort)}><option value="views">Views</option><option value="likes">Likes</option><option value="comments">Comments</option></select></label></div>
          {data.topVideos.length ? <div className="creator-analytics-top-list">{data.topVideos.map((video) => <Link href={`/watch/${video.id}`} className="creator-analytics-top-row" key={video.id}><div className="creator-analytics-thumbnail">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <span>{video.title.slice(0, 1).toUpperCase()}</span>}</div><strong>{video.title}</strong><span>{numberFormat(video.views)} views</span><span>{numberFormat(video.likes)} likes</span><span>{numberFormat(video.comments)} comments</span></Link>)}</div> : <p className="creator-analytics-list-empty">No eligible published videos have activity in this range.</p>}
        </section>
        <div className="creator-analytics-insights">
          <section className="creator-analytics-audience"><div className="creator-analytics-section-heading"><div><p className="creator-studio-eyebrow">Audience</p><h2>Unique viewers</h2></div><Users size={18} aria-hidden="true" /></div><strong>{numberFormat(data.audience.uniqueViewers)}</strong><p>Distinct viewer accounts with a watch-history record in this range.</p></section>
          <section className="creator-analytics-audience creator-analytics-realtime"><div className="creator-analytics-section-heading"><div><p className="creator-studio-eyebrow">Realtime</p><h2>Live activity</h2></div><Activity size={18} aria-hidden="true" /></div><p>Reliable last-hour and 48-hour counts aren&apos;t available yet. Watch history retains each viewer&apos;s latest video timestamp, not a complete view-event stream.</p></section>
        </div>
      </div>
      <section className="creator-analytics-list-section creator-analytics-recent"><div className="creator-analytics-section-heading"><div><p className="creator-studio-eyebrow">Library</p><h2>Recent content</h2></div><Link href="/creator/content">View all</Link></div>
        {data.recentVideos.length ? <div className="creator-analytics-recent-list">{data.recentVideos.map((video) => <Link href={`/watch/${video.id}`} className="creator-analytics-recent-row" key={video.id}><div className="creator-analytics-thumbnail">{video.thumbnailUrl ? <img src={video.thumbnailUrl} alt="" /> : <span>{video.title.slice(0, 1).toUpperCase()}</span>}</div><div className="creator-analytics-recent-title"><strong>{video.title}</strong><span>{new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(video.publishedAt ?? video.createdAt ?? ""))}</span></div><span className={`creator-analytics-status creator-analytics-status-${(video.status ?? "draft").toLowerCase()}`}>{video.visibility ?? video.status}</span><span>{numberFormat(video.views)} views · {numberFormat(video.likes)} likes · {numberFormat(video.comments)} comments</span></Link>)}</div> : <p className="creator-analytics-list-empty">No videos have been uploaded yet.</p>}
      </section>
      <p className="creator-analytics-data-note">Watch time and revenue aren&apos;t recorded. Traffic-source attribution and demographic data aren&apos;t collected.</p>
    </>}
  </div>;
}