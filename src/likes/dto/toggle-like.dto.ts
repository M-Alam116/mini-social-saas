import { ApiProperty } from '@nestjs/swagger';

export class ToggleLikeDto {
  @ApiProperty({ example: 1, description: 'The ID of the post' })
  postId: number;
}
