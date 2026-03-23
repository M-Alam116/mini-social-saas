import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 1, description: 'The ID of the post' })
  @IsNumber()
  @IsNotEmpty()
  postId: number;

  @ApiProperty({ example: 'Nice post!', description: 'The comment content' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
