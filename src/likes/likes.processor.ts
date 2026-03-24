import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';

@Processor('likes')
export class LikesProcessor extends WorkerHost {
  private readonly logger = new Logger(LikesProcessor.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { userId, postId, action } = job.data;

    try {
      if (action === 'like') {
        const result = await this.prisma.post_likes.createMany({
          data: [{ user_id: userId, post_id: postId }],
          skipDuplicates: true,
        });
        
        // If we really added a like (count=1), update Redis
        if (result.count === 1) {
          const countKey = `post_likes_count_${postId}`;
          const currentCount: number = (await this.cacheManager.get(countKey)) ?? 0;
          await this.cacheManager.set(countKey, currentCount + 1, 3600 * 1000);
        }
      } else if (action === 'unlike') {
        const deleted = await this.prisma.post_likes.deleteMany({
          where: { post_id: postId, user_id: userId },
        });
        
        if (deleted.count > 0) {
          const countKey = `post_likes_count_${postId}`;
          const currentCount: number = (await this.cacheManager.get(countKey)) ?? 0;
          await this.cacheManager.set(countKey, Math.max(0, currentCount - 1), 3600 * 1000);
        }
      }

      // Eventual consistency: Profile stats refresh naturally
    } catch (error) {
      this.logger.error(`Error processing like/unlike: ${error.message}`);
      throw error;
    }
  }
}
