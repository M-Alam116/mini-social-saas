import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { BullModule } from '@nestjs/bullmq';
import { CommentsProcessor } from './comments.processor';

@Module({
  imports: [
    PrismaModule, 
    AuthModule,
    BullModule.registerQueue({
      name: 'comments',
    }),
  ],
  providers: [CommentsService, CommentsProcessor],
  controllers: [CommentsController],
  exports: [CommentsService],
})
export class CommentsModule {}
