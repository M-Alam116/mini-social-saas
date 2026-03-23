import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

  async toggleLike(userId: number, postId: number) {
    const existingLike = await this.prisma.post_likes.findUnique({
      where: {
        post_id_user_id: {
          post_id: postId,
          user_id: userId,
        },
      },
    });

    if (existingLike) {
      await this.prisma.post_likes.delete({
        where: { id: existingLike.id },
      });
      return { liked: false };
    } else {
      await this.prisma.post_likes.create({
        data: {
          user_id: userId,
          post_id: postId,
        },
      });
      return { liked: true };
    }
  }
}
