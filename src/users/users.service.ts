import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) { }

  private sanitize(user: any) {
    if (!user) return null;
    if (Array.isArray(user)) {
      return user.map(u => this.sanitize(u));
    }
    const { password, ...result } = user;
    return result;
  }



  async findAll(page = 1, limit = 10, sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'desc') {
    const skip = (page - 1) * limit;

    const users = await this.prisma.users.findMany({
      skip,
      take: +limit,
      orderBy: { [sortBy]: sortOrder },
    });

    const total = await this.prisma.users.count();

    return {
      result: this.sanitize(users),
      meta: {
        total,
        page: +page,
        limit: +limit,
        totalPages: Math.ceil(total / limit),
      },
      message: 'Users list retrieved successfully',
    };
  }

  async findOneByEmail(email: string) {
    return this.prisma.users.findUnique({
      where: { email },
    });
  }

  async findOneById(id: number) {
    return this.prisma.users.findUnique({
      where: { id },
    });
  }

  async create(data: any) {
    const user = await this.prisma.users.create({
      data,
    });
    return this.sanitize(user);
  }

  async update(id: number, data: any) {
    try {
      const user = await this.prisma.users.update({
        where: { id },
        data,
      });
      return this.sanitize(user);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const user = await this.prisma.users.delete({
        where: { id },
      });
      return this.sanitize(user);
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      throw error;
    }
  }

  async getUserProfile(userId: number) {
    const cacheKey = `user_profile_${userId}`;
    const cachedData = await this.cacheManager.get(cacheKey);
    if (cachedData) {
      console.log(`--- CACHE HIT: User Profile ${userId} ---`);
      return cachedData;
    }

    console.log(`--- CACHE MISS: Fetching User Profile ${userId} from DB ---`);
    const stats: any[] = await this.prisma.$queryRaw`
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.country,
        (SELECT COUNT(*) FROM posts p WHERE p.user_id = u.id) as total_posts,
        (SELECT COUNT(*) FROM post_likes l JOIN posts p ON l.post_id = p.id WHERE p.user_id = u.id) as total_likes_received,
        (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) as total_comments_made,
        (SELECT COUNT(*) FROM comments c JOIN posts p ON c.post_id = p.id WHERE p.user_id = u.id) as total_comments_received,
        (SELECT COUNT(*) FROM post_likes l WHERE l.user_id = u.id) as total_likes_made
      FROM users u
      WHERE u.id = ${userId}
    `;
    const user = stats[0] || null;
    if (user) {
      user.total_posts = Number(user.total_posts);
      user.total_likes_received = Number(user.total_likes_received);
      user.total_comments_made = Number(user.total_comments_made);
      user.total_comments_received = Number(user.total_comments_received);
      user.total_likes_made = Number(user.total_likes_made);
    }

    await this.cacheManager.set(cacheKey, user, 300 * 1000); // 5 minutes
    return user;
  }
}
