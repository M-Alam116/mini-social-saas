import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private prisma: PrismaService) { }

  async create(userId: number, title: string, content: string) {
    return this.prisma.posts.create({
      data: {
        user_id: userId,
        title,
        content,
      },
    });
  }

  async findAll() {
    return this.prisma.posts.findMany({
      include: {
        users: {
          select: { name: true },
        },
        _count: {
          select: {
            comments: true,
            post_likes: true,
          },
        },
      },
      orderBy: { created_at: 'desc' },
    });
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

    return this.prisma.posts.delete({ where: { id } });
  }
}
