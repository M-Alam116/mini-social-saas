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

  async findAll(page = 1, limit = 10, sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'desc', userId?: number) {
    // If sortBy is 'alive', use the special ranking logic
    if (sortBy === 'alive') {
      return this.getAliveFeed(userId, page, limit);
    }

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
        users: { select: { name: true, id: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    const decoratedPosts = await this._decoratePostsWithCounts(posts);

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

    await this.cacheManager.set(cacheKey, response, 300 * 1000); // 5 minutes
    return response;
  }

  async getAliveFeed(userId?: number, page = 1, limit = 10) {
    const cacheKey = `posts_alive_feed_${userId || 'guest'}_${page}_${limit}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log('--- CACHE HIT: Alive Feed ---');
      return cachedData;
    }

    console.log('--- CACHE MISS: Calculating Alive Feed ---');

    // 1. Fetch a pool of recent posts (last 200) to rank from
    const posts = await this.prisma.posts.findMany({
      take: 200,
      include: {
        users: { select: { name: true, id: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    // 2. Decorate with counts
    const postsWithCounts = await this._decoratePostsWithCounts(posts);

    // 3. Get user interaction history (authors this user has liked)
    let favoriteAuthors = new Set<number>();
    if (userId) {
      const recentLikes = await this.prisma.post_likes.findMany({
        where: { user_id: userId },
        take: 50,
        select: { posts: { select: { user_id: true } } },
      });
      recentLikes.forEach((l) => {
        if (l.posts?.user_id) favoriteAuthors.add(l.posts.user_id);
      });
    }

    // 4. Ranking Formula: score = (likes * 2) + (comments * 3) + recency_decay
    const now = new Date();
    const rankedPosts = postsWithCounts.map((post) => {
      const likes = post._count.post_likes;
      const comments = post._count.comments;
      const hoursSinceCreation = Math.max(0.1, (now.getTime() - new Date(post.created_at).getTime()) / 3600000);

      // recency_decay: higher value for newer posts, dropping off over time
      const recencyDecay = 24 / (hoursSinceCreation + 1);

      let score = (likes * 2) + (comments * 3) + recencyDecay;

      // Interaction history boost: +5 pts if you've liked this author before
      if (post.user_id && favoriteAuthors.has(post.user_id)) {
        score += 5;
      }

      return { ...post, score };
    });

    // 5. Sort by score (desc), with ID as a fallback for ties to ensure deterministic order
    rankedPosts.sort((a, b) => b.score - a.score || b.id - a.id);

    // 6. Paginate from pool
    const skip = (page - 1) * limit;
    const paginatedPosts = rankedPosts.slice(skip, skip + limit);

    const response = {
      result: paginatedPosts,
      meta: {
        total: Math.min(rankedPosts.length, 100), // Cap visible feed for this logic
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(Math.min(rankedPosts.length, 100) / limit),
      },
      message: 'Alive feed retrieved successfully',
    };

    await this.cacheManager.set(cacheKey, response, 60 * 1000); // Cache for 1 minute
    return response;
  }

  private async _decoratePostsWithCounts(posts: any[]) {
    if (posts.length === 0) return [];

    const likeKeys = posts.map((p) => `post_likes_count_${p.id}`);
    const commentKeys = posts.map((p) => `post_comments_count_${p.id}`);

    let allLikes: any[] = [];
    let allComments: any[] = [];

    try {
      allLikes = await Promise.all(likeKeys.map((k) => this.cacheManager.get(k)));
      allComments = await Promise.all(commentKeys.map((k) => this.cacheManager.get(k)));
    } catch (e) {
      allLikes = likeKeys.map(() => 0);
      allComments = commentKeys.map(() => 0);
    }

    return posts.map((post, idx) => ({
      ...post,
      _count: {
        post_likes: Number(allLikes[idx] || 0),
        comments: Number(allComments[idx] || 0),
      },
    }));
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
