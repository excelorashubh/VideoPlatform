  export type ApiUser = {
  id: string;
  email: string;
  displayName: string;
  role: "VIEWER" | "CREATOR" | "MODERATOR" | "ADMIN" | "SUPER_ADMIN";
  createdAt: string;
  updatedAt: string;
};

export type ApiSession = {
  id: string;
  token: string;
  expiresAt: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  displayName: string;
  password: string;
  role?: "VIEWER";
};

export type AuthResponse = {
  user: ApiUser;
  session: ApiSession;
};

export type CreatorApplication = {
  id: string;
  creatorName: string | null;
  handle: string | null;
  category: string | null;
  bio: string | null;
  profileImageKey: string | null;
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  termsAcceptedAt?: string | null;
};

export type CreatorApplicationResponse = {
  isCreator: boolean;
  application: CreatorApplication | null;
  verification?: { email: string; emailVerified: boolean; phoneNumber: string | null; phoneVerified: boolean };
};

export type CreatorApplicationInput = {
  creatorName: string;
  handle: string;
  category: string;
  bio: string;
  profileImageKey?: string;
  termsAccepted?: boolean;
};

export async function getVerificationStatus() {
  return apiRequest<{ email: string; emailVerified: boolean; phoneNumber: string | null; phoneVerified: boolean }>("/auth/verification/status");
}

export async function sendEmailVerification() { return apiRequest<{ sent: boolean; delivery: string }>("/auth/email-verification/send", { method: "POST" }); }
export async function verifyEmail(code: string) { return apiRequest("/auth/email-verification/verify", { method: "POST", body: JSON.stringify({ code }) }); }
export async function sendPhoneVerification(phoneNumber: string) { return apiRequest<{ sent: boolean; delivery: string }>("/auth/phone-verification/send", { method: "POST", body: JSON.stringify({ phoneNumber }) }); }
export async function verifyPhone(code: string) { return apiRequest("/auth/phone-verification/verify", { method: "POST", body: JSON.stringify({ code }) }); }

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("gvp_session_token") : null;

  const headers = new Headers(options.headers ?? {});
  headers.set("Content-Type", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  const text = await response.text();
  let data: { message?: string | string[] } | null = null;
  if (text) {
    try {
      const parsed: unknown = JSON.parse(text);
      data = parsed && typeof parsed === "object" ? parsed as { message?: string | string[] } : null;
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    const serverMessage = typeof data?.message === "string"
      ? data.message
      : Array.isArray(data?.message)
        ? data.message.join(", ")
        : null;

    if (response.status >= 500 && !serverMessage) {
      throw new Error(
        "We couldn’t create your account right now because the server is unavailable. Please try again in a moment."
      );
    }

    throw new Error(serverMessage ?? "Request failed");
  }

  return data as T;
}

export async function loginUser(input: LoginRequest): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ ...input, email: input.email.trim() })
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("gvp_session_token", response.session.token);
    localStorage.setItem("gvp_user", JSON.stringify(response.user));
  }

  return response;
}

export async function registerUser(input: RegisterRequest): Promise<AuthResponse> {
  const response = await apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });

  if (typeof window !== "undefined") {
    localStorage.setItem("gvp_session_token", response.session.token);
    localStorage.setItem("gvp_user", JSON.stringify(response.user));
  }

  return response;
}

export async function getCurrentUser(): Promise<ApiUser> {
  return apiRequest<ApiUser>("/auth/me");
}

export async function getCreatorApplication() {
  return apiRequest<CreatorApplicationResponse>("/creator/application");
}

export type CreatorDashboard = {
  creator: { name: string; handle: string | null; bio: string | null; profileImageKey: string | null };
  channel: { id: string; handle: string; displayName: string; description: string | null; avatarKey: string | null; subscribers: number } | null;
  stats: { subscribers: number; videos: number; views: number; comments: number };
  videos: Array<{ id: string; title: string; description?: string | null; visibility: "PUBLIC" | "UNLISTED" | "PRIVATE"; status: string; creatorStatus?: string; createdAt: string; publishedAt: string | null; thumbnailUrl?: string | null; _count: { likes: number; comments: number; history: number }; thumbnails: Array<{ storageKey: string; isCustom?: boolean }> }>;
};

export async function getCreatorDashboard() {
  return apiRequest<CreatorDashboard>("/creator/dashboard");
}

export type CreatorAnalyticsRange = "7d" | "28d" | "90d" | "365d" | "lifetime";
export type CreatorAnalyticsSort = "views" | "likes" | "comments";
export type CreatorAnalyticsVideo = {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
  createdAt?: string;
  publishedAt?: string | null;
  status?: string;
  visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE";
};
export type CreatorAnalyticsResponse = {
  range: CreatorAnalyticsRange;
  sortBy: CreatorAnalyticsSort;
  creator: { name: string; handle: string | null };
  overview: { views: number; likes: number; comments: number; subscriptions: number; subscribers: number };
  previousPeriod: { views: number; likes: number; comments: number; subscriptions: number } | null;
  series: Array<{ date: string; views: number; likes: number; comments: number; subscriptions: number }>;
  audience: { uniqueViewers: number };
  topVideos: CreatorAnalyticsVideo[];
  recentVideos: CreatorAnalyticsVideo[];
  hasActivity: boolean;
};

export async function getCreatorAnalytics(range: CreatorAnalyticsRange, sortBy: CreatorAnalyticsSort) {
  const params = new URLSearchParams({ range, sort: sortBy });
  return apiRequest<CreatorAnalyticsResponse>(`/creator/analytics?${params.toString()}`);
}

export type CreatorPlaylistVideo = { id: string; title: string; status: string; visibility: "PUBLIC" | "UNLISTED" | "PRIVATE"; createdAt: string; thumbnailUrl: string | null; position?: number };
export type CreatorPlaylist = { id: string; title: string; isPublic: boolean; videoCount: number; createdAt: string; updatedAt: string; thumbnailUrl?: string | null; videos?: CreatorPlaylistVideo[] };
export async function getCreatorPlaylists() { return apiRequest<CreatorPlaylist[]>("/creator/playlists"); }
export async function getCreatorPlaylistVideos() { return apiRequest<Omit<CreatorPlaylistVideo, "position">[]>("/creator/playlists/videos"); }
export async function getCreatorPlaylist(playlistId: string) { return apiRequest<CreatorPlaylist & { videos: CreatorPlaylistVideo[] }>(`/creator/playlists/${encodeURIComponent(playlistId)}`); }
export async function createCreatorPlaylist(input: { title: string; isPublic: boolean }) { return apiRequest<CreatorPlaylist>("/creator/playlists", { method: "POST", body: JSON.stringify(input) }); }
export async function updateCreatorPlaylist(playlistId: string, input: { title: string; isPublic: boolean }) { return apiRequest<CreatorPlaylist>(`/creator/playlists/${encodeURIComponent(playlistId)}`, { method: "PATCH", body: JSON.stringify(input) }); }
export async function deleteCreatorPlaylist(playlistId: string) { return apiRequest<{ id: string; deleted: boolean }>(`/creator/playlists/${encodeURIComponent(playlistId)}`, { method: "DELETE" }); }
export async function addCreatorPlaylistVideo(playlistId: string, videoId: string) { return apiRequest<CreatorPlaylist & { videos: CreatorPlaylistVideo[] }>(`/creator/playlists/${encodeURIComponent(playlistId)}/videos`, { method: "POST", body: JSON.stringify({ videoId }) }); }
export async function removeCreatorPlaylistVideo(playlistId: string, videoId: string) { return apiRequest<CreatorPlaylist & { videos: CreatorPlaylistVideo[] }>(`/creator/playlists/${encodeURIComponent(playlistId)}/videos/${encodeURIComponent(videoId)}`, { method: "DELETE" }); }
export async function reorderCreatorPlaylistVideos(playlistId: string, videoIds: string[]) { return apiRequest<CreatorPlaylist & { videos: CreatorPlaylistVideo[] }>(`/creator/playlists/${encodeURIComponent(playlistId)}/videos/order`, { method: "PATCH", body: JSON.stringify({ videoIds }) }); }

export type CreatorManagedComment = { id: string; body: string; videoId: string; parentId: string | null; createdAt: string; replyCount: number; author: { id: string; displayName: string }; video: { id: string; title: string } };
export type CreatorCommentsResponse = { items: CreatorManagedComment[]; videos: Array<{ id: string; title: string }>; page: number; pageSize: number; total: number; hasMore: boolean };
export async function getCreatorComments(input: { page?: number; search?: string; videoId?: string } = {}) {
  const params = new URLSearchParams({ page: String(input.page ?? 1) });
  if (input.search) params.set("search", input.search);
  if (input.videoId) params.set("videoId", input.videoId);
  return apiRequest<CreatorCommentsResponse>(`/creator/comments?${params.toString()}`);
}
export async function deleteCreatorComment(commentId: string) { return apiRequest<{ id: string; deleted: boolean }>(`/creator/comments/${encodeURIComponent(commentId)}`, { method: "DELETE" }); }

export type CreatorCustomization = {
  creator: { name: string; handle: string | null };
  channel: { id: string; displayName: string; handle: string; description: string | null; avatarKey: string | null; bannerKey: string | null; avatarUrl: string | null; bannerUrl: string | null } | null;
};
export async function getCreatorCustomization() { return apiRequest<CreatorCustomization>("/creator/customization"); }
export async function updateCreatorCustomization(input: { displayName?: string; handle?: string; description?: string }) { return apiRequest<{ id: string; displayName: string; handle: string; description: string | null }>("/creator/customization", { method: "PATCH", body: JSON.stringify(input) }); }
export async function createChannelAssetUpload(input: { kind: "avatar" | "banner"; contentType: string; fileSize: number }) { return apiRequest<{ key: string; uploadUrl: string }>("/creator/customization/assets/upload", { method: "POST", body: JSON.stringify(input) }); }
export async function completeChannelAssetUpload(input: { kind: "avatar" | "banner"; key: string }) { return apiRequest<{ channelId: string; kind: string; key: string; updated: boolean }>("/creator/customization/assets/complete", { method: "POST", body: JSON.stringify(input) }); }

export type CreatorContentItem = {
  id: string;
  title: string;
  description: string | null;
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE";
  status: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  thumbnailUrl: string | null;
  views: number;
  likes: number;
  comments: number;
};

export async function getCreatorContent() {
  return apiRequest<{ items: CreatorContentItem[]; total: number }>("/creator/content");
}

export type PublicVideo = {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  videoUrl: string | null;
  creator: { id: string; channelId: string; name: string; handle: string; avatarUrl: string | null };
  views: number;
  publishedAt: string;
};

export async function getPublicVideos() {
  return apiRequest<{ items: PublicVideo[]; total: number }>("/videos/public");
}

export async function getPublicVideo(id: string) {
  return apiRequest<PublicVideo>(`/videos/${encodeURIComponent(id)}`);
}

export type VideoEngagement = { likeCount: number; dislikeCount: number; commentCount: number; subscriberCount: number; viewerReaction: "LIKE" | "DISLIKE" | null; viewerSubscribed: boolean };
export type VideoReaction = Pick<VideoEngagement, "likeCount" | "dislikeCount" | "viewerReaction">;
export type ChannelSubscriptionState = { subscribed: boolean; subscriberCount: number };
export async function getVideoEngagement(id: string) { return apiRequest<VideoEngagement>(`/videos/${encodeURIComponent(id)}/engagement`); }
export async function registerVideoView(id: string) { return apiRequest<{ registered: boolean }>(`/videos/${encodeURIComponent(id)}/view`, { method: "POST" }); }
export async function reactToVideo(videoId: string, type: "LIKE" | "DISLIKE") { return apiRequest<VideoReaction>("/likes", { method: "POST", body: JSON.stringify({ videoId, type }) }); }
export async function removeVideoReaction(videoId: string) { return apiRequest<VideoReaction>("/likes", { method: "DELETE", body: JSON.stringify({ videoId }) }); }
export async function getVideoReaction(videoId: string) { return apiRequest<Pick<VideoEngagement, "viewerReaction">>(`/likes/video/${encodeURIComponent(videoId)}`); }
export async function subscribeToChannel(channelId: string) { return apiRequest<ChannelSubscriptionState>("/subscriptions", { method: "POST", body: JSON.stringify({ channelId }) }); }
export async function unsubscribeFromChannel(channelId: string) { return apiRequest<ChannelSubscriptionState>("/subscriptions", { method: "DELETE", body: JSON.stringify({ channelId }) }); }
export async function getChannelSubscription(channelId: string) { return apiRequest<ChannelSubscriptionState>(`/subscriptions/channel/${encodeURIComponent(channelId)}`); }
export type VideoComment = { id: string; body: string; videoId: string; author: { id: string; displayName: string }; createdAt: string; parentId: string | null };
export async function getVideoComments(videoId: string) { return apiRequest<VideoComment[]>(`/comments/video/${encodeURIComponent(videoId)}`); }
export async function createVideoComment(videoId: string, body: string, parentId?: string) { return apiRequest<VideoComment>("/comments", { method: "POST", body: JSON.stringify({ videoId, body, parentId }) }); }
export async function deleteVideoComment(id: string) { return apiRequest(`/comments/${encodeURIComponent(id)}`, { method: "DELETE" }); }

export function getPublicVideoMediaUrl(id: string) {
  return `${API_BASE_URL}/videos/${encodeURIComponent(id)}/stream/master.m3u8`;
}

export type VideoPlayback = { videoId: string; type: "mp4"; url: string; mimeType: "video/mp4"; expiresIn: number };
export async function getPublicVideoPlayback(id: string) {
  return apiRequest<VideoPlayback>(`/videos/${encodeURIComponent(id)}/playback`);
}

export async function createCreatorDraftVideo(input: { title: string; description?: string; videoId?: string; visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE" }) {
  return apiRequest<{ id: string; creatorId: string; channelId: string; title: string; description: string | null; status: string }>("/creator/videos/draft", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCreatorVideo(videoId: string, input: { title?: string; description?: string; visibility?: "PUBLIC" | "UNLISTED" | "PRIVATE" }) {
  return apiRequest<CreatorContentItem>(`/creator/videos/${encodeURIComponent(videoId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteCreatorVideo(videoId: string) {
  return apiRequest<{ id: string; deleted: boolean }>(`/creator/videos/${encodeURIComponent(videoId)}`, { method: "DELETE" });
}

export async function retryCreatorVideoProcessing(videoId: string) {
  return apiRequest<{ id: string; status: string }>(`/creator/videos/${encodeURIComponent(videoId)}/retry-processing`, { method: "POST" });
}

export async function createThumbnailUpload(videoId: string, input: { contentType: string; fileSize: number }) {
  return apiRequest<{ key: string; uploadUrl: string }>(`/creator/videos/${encodeURIComponent(videoId)}/thumbnail/upload`, { method: "POST", body: JSON.stringify(input) });
}

export async function completeThumbnailUpload(videoId: string, key: string) {
  return apiRequest<{ videoId: string; key: string }>(`/creator/videos/${encodeURIComponent(videoId)}/thumbnail/complete`, { method: "POST", body: JSON.stringify({ key }) });
}

export async function removeCreatorThumbnail(videoId: string, key: string) {
  return apiRequest<{ videoId: string; key: string; removed: boolean }>(`/creator/videos/${encodeURIComponent(videoId)}/thumbnail`, { method: "DELETE", body: JSON.stringify({ key }) });
}

export type UploadSession = {
  uploadId: string;
  videoId: string;
  creatorId: string;
  fileSize: number;
  contentType: string;
  storageKey: string;
  uploadStatus: "created" | "completed";
  createdAt: string;
  completedAt?: string;
  processingJobId?: string;
  uploadUrl?: string;
};

export async function createUploadSession(input: { filename: string; fileSize: number; contentType: string; videoId: string }) {
  return apiRequest<UploadSession & { uploadUrl: string }>("/uploads/sessions", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function completeUploadSession(uploadId: string, checksum: string) {
  return apiRequest<UploadSession>(`/uploads/sessions/${encodeURIComponent(uploadId)}/complete`, {
    method: "POST",
    body: JSON.stringify({ checksum })
  });
}

export async function getUploadSession(uploadId: string) {
  return apiRequest<UploadSession>(`/uploads/sessions/${encodeURIComponent(uploadId)}`);
}

export async function submitCreatorApplication(input: CreatorApplicationInput) {
  return apiRequest<CreatorApplication>("/creator/application", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function saveCreatorApplicationDraft(input: CreatorApplicationInput) {
  return apiRequest<CreatorApplication>("/creator/application/draft", { method: "POST", body: JSON.stringify(input) });
}

export async function checkCreatorHandle(handle: string) {
  return apiRequest<{ handle: string; available: boolean }>(`/creator/handles/availability?handle=${encodeURIComponent(handle)}`);
}

export async function createProfileImageUpload(input: { contentType: string; fileSize: number }) {
  return apiRequest<{ key: string; uploadUrl: string }>("/creator/profile-image/upload", { method: "POST", body: JSON.stringify(input) });
}

export async function completeProfileImageUpload(key: string) {
  return apiRequest<{ key: string; imageUrl: string }>("/creator/profile-image/complete", { method: "POST", body: JSON.stringify({ key }) });
}

export type AdminOverview = {
  users: number;
  creators: number;
  videos: number;
  reports: number;
  queuedJobs: number;
  storageUploads: number;
};

export type AdminHealthStatus = "Operational" | "Degraded" | "Unavailable";

export type AdminHealth = {
  database: { label: string; status: AdminHealthStatus };
  redis: { label: string; status: AdminHealthStatus };
  storage: { label: string; status: AdminHealthStatus };
  processing: { label: string; status: AdminHealthStatus };
};

export type AdminUser = Pick<ApiUser, "id" | "email" | "displayName" | "role" | "createdAt" | "updatedAt"> & { suspendedAt?: string | null; deletedAt?: string | null };

export type AdminCreator = {
  id: string;
  name: string;
  email: string;
  handle: string;
  category: string;
  status: string;
  applicationDate: string;
  verificationStatus: string;
  subscribers: number;
  userId?: string;
};

export async function approveAdminCreator(userId: string) {
  return apiRequest(`/admin/creators/${encodeURIComponent(userId)}/approve`, { method: "PATCH" });
}

export async function rejectAdminCreator(userId: string) {
  return apiRequest(`/admin/creators/${encodeURIComponent(userId)}/reject`, { method: "PATCH" });
}

export type AdminContentItem = {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  creator: { displayName: string };
  channel: { handle: string };
  files: { storageKey: string }[];
  _count?: { likes: number; comments: number };
};

export type AdminModerationItem = {
  id: string;
  kind: string;
  reason: string;
  count: number;
  status: string;
  createdAt: string;
  reporter: string;
  assignedModerator: string;
};

export type AdminReport = {
  id: string;
  reason: string;
  createdAt: string;
  reporter: { displayName: string };
  targetType: string;
  targetId: string;
};

export type AdminProcessing = {
  id: string;
  status: string;
  type: string;
  attempts: number;
  availableAt: string;
  createdAt: string;
  updatedAt: string;
  lastError?: string | null;
  video?: { title: string };
};

export type AdminStorageStatus = {
  connectionStatus: string;
  bucket: string;
  totalObjects: number;
  totalTrackedMedia: number;
  totalStorageSize: number;
  failedStorageOperations: Array<{ id: string; status: string; contentType: string; createdAt: string }>;
  recentStorageActivity: Array<{ id: string; status: string; contentType: string; createdAt: string }>;
  endpoint: string;
};

export type AdminSettings = {
  platform: { name: string; description: string; maintenanceMode: boolean };
  registration: { allowRegistration: boolean; emailVerificationRequired: boolean; phoneVerificationRequired: boolean };
  creator: { onboardingEnabled: boolean; reviewRequired: boolean; monetizationThresholdSubscribers: number; monetizationThresholdWatchHours: number };
  upload: { maxUploadSizeMb: number; allowedFileTypes: string[] };
  processing: { retryLimit: number };
  moderation: { reportingEnabled: boolean };
  storage: { providerStatus: string };
};

export type AdminAuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  actor?: { displayName: string; email: string } | null;
};

export async function getAdminOverview() {
  return apiRequest<AdminOverview>("/admin/overview");
}

export async function getAdminHealth() {
  return apiRequest<AdminHealth>("/admin/health");
}

export async function getAdminUsers(search = "", role = "ALL", status = "ALL") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (role && role !== "ALL") params.set("role", role);
  if (status && status !== "ALL") params.set("status", status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AdminUser[]>(`/admin/users${suffix}`);
}

export type AdminUserInput = {
  email: string;
  displayName: string;
  password?: string;
  role: AdminUser["role"];
};

export async function createAdminUser(input: AdminUserInput) {
  return apiRequest<AdminUser>("/admin/users", { method: "POST", body: JSON.stringify(input) });
}

export async function updateAdminUser(userId: string, input: Partial<AdminUserInput>) {
  return apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(userId)}`, { method: "PATCH", body: JSON.stringify(input) });
}

export async function deleteAdminUser(userId: string) {
  return apiRequest<{ id: string; deleted: boolean }>(`/admin/users/${encodeURIComponent(userId)}`, { method: "DELETE" });
}

export async function suspendAdminUser(userId: string) {
  return apiRequest<{ id: string; suspendedAt: string }>(`/admin/users/${encodeURIComponent(userId)}/suspend`, { method: "PATCH" });
}

export async function unsuspendAdminUser(userId: string) {
  return apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/unsuspend`, { method: "PATCH" });
}

export async function restoreAdminUser(userId: string) {
  return apiRequest<AdminUser>(`/admin/users/${encodeURIComponent(userId)}/restore`, { method: "PATCH" });
}

export async function getAdminCreators(search = "", status = "ALL") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "ALL") params.set("status", status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AdminCreator[]>(`/admin/creators${suffix}`);
}

export async function getAdminContent(search = "", status = "ALL", visibility = "ALL") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "ALL") params.set("status", status);
  if (visibility && visibility !== "ALL") params.set("visibility", visibility);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AdminContentItem[]>(`/admin/content${suffix}`);
}

export async function getAdminModeration() {
  return apiRequest<AdminModerationItem[]>("/admin/moderation");
}

export async function getAdminReports(search = "", status = "ALL") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status && status !== "ALL") params.set("status", status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AdminReport[]>(`/admin/reports${suffix}`);
}

export async function getAdminUploads() {
  return apiRequest<Array<Record<string, unknown>>>("/admin/uploads");
}

export async function getAdminProcessing() {
  return apiRequest<AdminProcessing[]>("/admin/processing");
}

export async function getAdminAnalytics(range = "30d") {
  return apiRequest<{ range: string; metrics: Record<string, number | string> }>(`/admin/analytics${range ? `?range=${encodeURIComponent(range)}` : ""}`);
}

export async function getAdminSubscriptions(status = "ALL") {
  const params = new URLSearchParams();
  if (status && status !== "ALL") params.set("status", status);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<Array<Record<string, unknown>>>(`/admin/subscriptions${suffix}`);
}

export async function getAdminMonetization() {
  return apiRequest<Record<string, unknown>>("/admin/monetization");
}

export async function getAdminStorage() {
  return apiRequest<AdminStorageStatus>("/admin/storage");
}

export async function getAdminSettings() {
  return apiRequest<AdminSettings>("/admin/settings");
}

export async function getAdminAuditLogs(search = "", action = "ALL") {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (action && action !== "ALL") params.set("action", action);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  return apiRequest<AdminAuditLog[]>(`/admin/audit-logs${suffix}`);
}

export async function updateAdminUserRole(userId: string, role: AdminUser["role"]) {
  return apiRequest<{ id: string; role: AdminUser["role"] }>("/admin/users/role", {
    method: "PATCH",
    body: JSON.stringify({ userId, role })
  });
}

export async function updateAdminSettings(payload: Record<string, unknown>) {
  return apiRequest<{ success: boolean; updated: string[] }>("/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function logoutUser() {
  try {
    await apiRequest<{ revoked: boolean }>("/auth/logout", { method: "POST" });
  } finally {
    clearStoredAuth();
  }
}

export function getStoredSessionToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("gvp_session_token");
}

export function getStoredUser(): ApiUser | null {
  if (typeof window === "undefined") return null;

  const raw = localStorage.getItem("gvp_user");
  if (!raw) return null;

  try {
    return JSON.parse(raw) as ApiUser;
  } catch {
    return null;
  }
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("gvp_session_token");
  localStorage.removeItem("gvp_user");
}
