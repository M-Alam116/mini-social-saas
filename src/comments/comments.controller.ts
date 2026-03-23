import { Controller, Get, Post, Body, Delete, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({ summary: 'Add a comment to a post' })
  async create(@Request() req: any, @Body() data: CreateCommentDto) {
    return this.commentsService.create(req.user.userId, data.postId, data.content);
  }

  @Get()
  @ApiOperation({ summary: 'Get comments for a specific post with pagination' })
  @ApiQuery({ name: 'postId', required: true, example: 1 })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  async findByPost(
    @Query('postId') postId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.commentsService.findByPost(+postId, +page, +limit);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.commentsService.remove(+id, req.user);
  }
}
