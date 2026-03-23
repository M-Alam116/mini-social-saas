import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LikesService } from './likes.service';
import { ToggleLikeDto } from './dto/toggle-like.dto';

@ApiTags('Likes')
@Controller('likes')
export class LikesController {
  constructor(private likesService: LikesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('toggle')
  @ApiOperation({ summary: 'Toggle like/unlike on a post' })
  async toggle(@Request() req: any, @Body() data: ToggleLikeDto) {
    return this.likesService.toggleLike(req.user.userId, data.postId);
  }
}
