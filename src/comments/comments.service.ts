import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectQueue('comments') private commentsQueue: Queue,
  ) { }

  async create(userId: number, postId: number, content: string) {
    // 1. Long-term post validation cache
    const postValidCacheKey = `post_valid_${postId}`;
    let postValid = await this.cacheManager.get(postValidCacheKey);
    let authorId: number | null;

    if (postValid === undefined) {
      const post = await this.prisma.posts.findUnique({ 
        where: { id: postId },
        select: { id: true, user_id: true }
      });
      if (!post) throw new NotFoundException('Post not found');
      postValid = post.user_id ?? -1;
      await this.cacheManager.set(postValidCacheKey, postValid, 24 * 60 * 60 * 1000); // 24 hours
    }

    authorId = (postValid as number) === -1 ? null : (postValid as number);

    // 2. Queue for background async-write
    await this.commentsQueue.add('create-comment', { userId, postId, content });

    // Background Invalidation (Removed to maintain 100% cache hits)

    return { message: 'Comment submitted successfully' };
  }

  async findByPost(postId: number, page = 1, limit = 10, sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'asc') {
    const skip = (page - 1) * limit;

    const comments = await this.prisma.comments.findMany({
      where: { post_id: postId },
      skip,
      take: +limit,
      include: {
        users: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    const total = await this.prisma.comments.count({ where: { post_id: postId } });

    return {
      result: comments,
      meta: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Comments retrieved successfully',
    };
  }

  async remove(id: number, user: any) {
    const comment = await this.prisma.comments.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (user.role !== 'admin' && comment.user_id !== user.userId) {
      throw new ForbiddenException('You are not allowed to delete this comment');
    }

    return this.prisma.comments.delete({ where: { id } });
  }
}
