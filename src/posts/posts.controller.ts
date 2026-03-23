import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private postsService: PostsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  async create(@Request() req: any, @Body() data: CreatePostDto) {
    return this.postsService.create(req.user.userId, data.title, data.content);
  }

  @Get()
  @ApiOperation({ summary: 'Get all posts for feed with pagination & sorting' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc', enum: ['asc', 'desc'] })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    return this.postsService.findAll(+page, +limit, sortBy, sortOrder);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.postsService.remove(+id, req.user);
  }
}
