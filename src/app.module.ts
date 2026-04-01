import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { TribesModule } from './tribes/tribes.module';
import { ArticlesModule } from './articles/articles.module';
import { LanguageModule } from './language/language.module';
import { EventsModule } from './events/events.module';
import { MediaModule } from './media/media.module';
import { CommentsModule } from './comments/comments.module';
import { BookmarksModule } from './bookmarks/bookmarks.module';
import { FollowsModule } from './follows/follows.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SearchModule } from './search/search.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    TribesModule,
    ArticlesModule,
    LanguageModule,
    EventsModule,
    MediaModule,
    CommentsModule,
    BookmarksModule,
    FollowsModule,
    NotificationsModule,
    SearchModule,
    AdminModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
