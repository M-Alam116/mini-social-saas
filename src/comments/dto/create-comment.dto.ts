import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 1, description: 'The ID of the post' })
  postId: number;

  @ApiProperty({ example: 'Nice post!', description: 'The comment content' })
  content: string;
}
