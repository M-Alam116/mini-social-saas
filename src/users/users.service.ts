import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) { }

  private sanitize(user: any) {
    if (!user) return null;
    if (Array.isArray(user)) {
      return user.map(u => this.sanitize(u));
    }
    const { password, ...result } = user;
    return result;
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

  async findAll() {
    const users = await this.prisma.users.findMany();
    return this.sanitize(users);
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

    return user;
  }
}
