import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Processor('comments')
export class CommentsProcessor extends WorkerHost {
  private readonly logger = new Logger(CommentsProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId, postId, content } = job.data;

    try {
      const comment = await this.prisma.comments.create({
        data: {
          user_id: userId,
          post_id: postId,
          content,
        },
      });

      // Increment cached count
      const countKey = `post_comments_count_${postId}`;
      const currentCount: number = (await this.cacheManager.get(countKey)) ?? 0;
      await this.cacheManager.set(countKey, currentCount + 1, 3600 * 1000); // 1h

      // Profile stats will refresh eventually
      
      this.logger.log(`Successfully processed comment creation for user ${userId} on post ${postId}`);
      return comment;
    } catch (error) {
      this.logger.error(`Error processing comment creation: ${error.message}`);
      throw error;
    }
  }
}
