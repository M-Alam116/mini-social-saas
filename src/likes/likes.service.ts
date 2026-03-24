import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('likes') private likesQueue: Queue,
  ) { }

  async toggleLike(userId: number, postId: number) {
    // 1. Check if post existence is cached (Very long TTL)
    const postExistsCacheKey = `post_valid_${postId}`;
    let postValid = await this.cacheManager.get(postExistsCacheKey);

    // If we haven't seen this post before, we'll validate it once and cache for 24h
    if (postValid === undefined) {
      const post = await this.prisma.posts.findUnique({ 
        where: { id: postId },
        select: { id: true, user_id: true } 
      });
      if (!post) throw new NotFoundException('Post not found');
      postValid = post.user_id ?? -1;
      await this.cacheManager.set(postExistsCacheKey, postValid, 24 * 60 * 60 * 1000); // 24 hours
    }

    const authorId = (postValid as number) === -1 ? null : (postValid as number);

    // 2. Pure Redis-speed Like Toggle State
    const likeKey = `u_l_p_${userId}_${postId}`;
    const alreadyLiked = await this.cacheManager.get(likeKey);

    let liked: boolean;
    if (alreadyLiked) {
      await this.cacheManager.del(likeKey);
      await this.likesQueue.add('toggle-like', { userId, postId, action: 'unlike' }, { jobId: `unlike_${userId}_${postId}` });
      liked = false;
    } else {
      await this.cacheManager.set(likeKey, true, 86400 * 1000); // 1 day
      await this.likesQueue.add('toggle-like', { userId, postId, action: 'like' }, { jobId: `like_${userId}_${postId}` });
      liked = true;
    }

    // Background invalidation (Now rare to avoid DB pressure)
    // Removed frequent del to maintain high hit rate

    return { liked };
  }
}
