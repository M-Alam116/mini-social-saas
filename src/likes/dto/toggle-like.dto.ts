import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';

export class ToggleLikeDto {
  @ApiProperty({ example: 1, description: 'The ID of the post' })
  @IsNumber()
  @IsNotEmpty()
  postId: number;
}
