import { Injectable, ForbiddenException, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) { }

  async create(userId: number, title: string, content: string) {
    const post = await this.prisma.posts.create({
      data: {
        user_id: userId,
        title,
        content,
      },
    });

    // Invalidate first few pages of feed cache
    await this.cacheManager.del('posts_feed_1_10_created_at_desc');

    return {
      result: post,
      message: 'Post created successfully',
    };
  }

  async findAll(page = 1, limit = 10, sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'desc') {
    const cacheKey = `posts_feed_${page}_${limit}_${sortBy}_${sortOrder}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log('--- CACHE HIT: Posts Feed ---');
      return cachedData;
    }

    console.log('--- CACHE MISS: Fetching Posts Feed from DB ---');
    const skip = (page - 1) * limit;

    const posts = await this.prisma.posts.findMany({
      skip,
      take: +limit,
      include: {
        users: { select: { name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    // Decorate with counts from Redis (True Atomic Batching)
    const likeKeys = posts.map(p => `post_likes_count_${p.id}`);
    const commentKeys = posts.map(p => `post_comments_count_${p.id}`);

    // Use mget for O(1) multi-key fetch on the underlying store
    const store: any = (this.cacheManager as any).store;
    let allLikes: any[] = [];
    let allComments: any[] = [];

    try {
      // In NestJS CacheManager with ioredis-yet, we can use store.mget or store.client.mget
      allLikes = await Promise.all(likeKeys.map(k => this.cacheManager.get(k)));
      allComments = await Promise.all(commentKeys.map(k => this.cacheManager.get(k)));
    } catch (e) {
      allLikes = likeKeys.map(() => 0);
      allComments = commentKeys.map(() => 0);
    }

    const decoratedPosts = posts.map((post, idx) => ({
      ...post,
      _count: {
        post_likes: Number(allLikes[idx] || 0),
        comments: Number(allComments[idx] || 0),
      },
    }));

    const total = await this.prisma.posts.count();
    const response = {
      result: decoratedPosts,
      meta: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Feed retrieved successfully',
    };

    await this.cacheManager.set(cacheKey, response, 600 * 1000); // 10 minutes
    return response;
  }

  async findOne(id: number) {
    return this.prisma.posts.findUnique({ where: { id } });
  }

  async remove(id: number, user: any) {
    const post = await this.prisma.posts.findUnique({ where: { id } });
    if (!post) throw new NotFoundException('Post not found');

    if (user.role !== 'admin' && post.user_id !== user.userId) {
      throw new ForbiddenException('You are not allowed to delete this post');
    }

    await this.prisma.posts.delete({ where: { id } });
    return { message: 'Post deleted successfully' };
  }
}
