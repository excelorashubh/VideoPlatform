import { AppShell, PageHeading } from "../_components/AppShell";

export default function NotificationsPage() {
  return <AppShell eyebrow="Your activity" title="Notifications"><PageHeading eyebrow="Inbox" title="What is happening" action="Mark all read" /><div className="notification-list">{["GVP Editorial published a new video", "Your comment received a reply", "A live session starts tomorrow"].map((item, index) => <article className={index === 0 ? "notification unread" : "notification"} key={item}><span className="notification-dot" /><div><strong>{item}</strong><p className="muted">{index + 1} hour{index === 0 ? "" : "s"} ago</p></div></article>)}</div></AppShell>;
}
