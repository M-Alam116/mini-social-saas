import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({ example: 'John Updated', required: false })
  name?: string;

  @ApiProperty({ example: 'USA', required: false })
  country?: string;

  @ApiProperty({ example: 'user', enum: ['user', 'admin'], required: false })
  role?: string;
}
