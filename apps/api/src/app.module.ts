import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { DatabaseModule } from "./database/database.module.js";
import { HealthController } from "./health/health.controller.js";
import { AuthGuard } from "./modules/auth/auth.guard.js";
import { AuthModule } from "./modules/auth/auth.module.js";
import { UsersModule } from "./modules/users/users.module.js";
import { SessionsModule } from "./modules/sessions/sessions.module.js";
import { ChannelsModule } from "./modules/channels/channels.module.js";
import { VideosModule } from "./modules/videos/videos.module.js";
import { UploadsModule } from "./modules/uploads/uploads.module.js";
import { ProcessingModule } from "./modules/processing/processing.module.js";
import { CommentsModule } from "./modules/comments/comments.module.js";
import { LikesModule } from "./modules/likes/likes.module.js";
import { SubscriptionsModule } from "./modules/subscriptions/subscriptions.module.js";
import { SearchModule } from "./modules/search/search.module.js";
import { HistoryModule } from "./modules/history/history.module.js";
import { PlaylistsModule } from "./modules/playlists/playlists.module.js";
import { NotificationsModule } from "./modules/notifications/notifications.module.js";
import { StudioModule } from "./modules/studio/studio.module.js";
import { ModerationModule } from "./modules/moderation/moderation.module.js";
import { AdminModule } from "./modules/admin/admin.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { QueueModule } from "./queue/queue.module.js";
import { CreatorModule } from "./modules/creator/creator.module.js";

@Module({
  imports: [DatabaseModule, StorageModule, QueueModule, CreatorModule, AuthModule, UsersModule, SessionsModule, ChannelsModule, VideosModule, UploadsModule, ProcessingModule, CommentsModule, LikesModule, SubscriptionsModule, SearchModule, HistoryModule, PlaylistsModule, NotificationsModule, StudioModule, ModerationModule, AdminModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: AuthGuard }]
})
export class AppModule {}
