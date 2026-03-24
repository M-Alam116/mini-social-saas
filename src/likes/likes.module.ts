import { Module } from '@nestjs/common';
import { LikesService } from './likes.service';
import { LikesController } from './likes.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

import { BullModule } from '@nestjs/bullmq';
import { LikesProcessor } from './likes.processor';

@Module({
  imports: [
    PrismaModule, 
    AuthModule,
    BullModule.registerQueue({
      name: 'likes',
    }),
  ],
  providers: [LikesService, LikesProcessor],
  controllers: [LikesController],
  exports: [LikesService],
})
export class LikesModule {}
