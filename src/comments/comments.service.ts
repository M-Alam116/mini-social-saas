import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, postId: number, content: string) {
    return this.prisma.comments.create({
      data: {
        user_id: userId,
        post_id: postId,
        content,
      },
      include: {
        users: { select: { name: true } },
      },
    });
  }

  async findByPost(postId: number) {
    return this.prisma.comments.findMany({
      where: { post_id: postId },
      include: {
        users: { select: { name: true } },
      },
      orderBy: { created_at: 'asc' },
    });
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
