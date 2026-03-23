import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'My First Post', description: 'The title of the post' })
  title: string;

  @ApiProperty({ example: 'This is the content of my first post', description: 'The body content' })
  content: string;
}
