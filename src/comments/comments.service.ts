import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  async create(userId: number, postId: number, content: string) {
    const post = await this.prisma.posts.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const authorId = post.user_id;

    const comment = await this.prisma.comments.create({
      data: {
        user_id: userId,
        post_id: postId,
        content,
      },
      include: {
        users: { select: { name: true } },
      },
    });

    // Invalidate caches
    await this.cacheManager.del(`user_profile_${userId}`);
    if (authorId) await this.cacheManager.del(`user_profile_${authorId}`);
    await this.cacheManager.del('posts_feed_1_10_created_at_desc');

    return comment;
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
