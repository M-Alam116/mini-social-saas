import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async toggleLike(userId: number, postId: number) {
    const post = await this.prisma.posts.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const authorId = post.user_id;

    const result = await this.prisma.$transaction(async (tx) => {
      const existingLike = await tx.post_likes.findUnique({
        where: { post_id_user_id: { post_id: postId, user_id: userId } },
      });

      if (existingLike) {
        await tx.post_likes.delete({ where: { id: existingLike.id } });
        return { liked: false };
      } else {
        await tx.post_likes.create({ data: { user_id: userId, post_id: postId } });
        return { liked: true };
      }
    });

    // Invalidate caches
    await this.cacheManager.del(`user_profile_${userId}`);
    if (authorId) await this.cacheManager.del(`user_profile_${authorId}`);
    await this.cacheManager.del('posts_feed_1_10_created_at_desc');

    return result;
  }
}
