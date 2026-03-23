import { Controller, Get, UseGuards, Request, Put, Delete, Param, Body, ForbiddenException, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile with stats' })
  async getProfile(@Request() req: any) {
    return this.usersService.getUserProfile(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put('me')
  @ApiOperation({ summary: 'Update own account' })
  async updateOwn(@Request() req: any, @Body() data: UpdateUserDto) {
    // Users cannot change their own role normally
    const { role, ...updateData } = data;
    return this.usersService.update(req.user.userId, updateData);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('me')
  @ApiOperation({ summary: 'Delete own account' })
  async deleteOwn(@Request() req: any) {
    return this.usersService.remove(req.user.userId);
  }

  // --- ADMIN ENDPOINTS ---

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Admin: Get all users list with pagination & sorting' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'sortBy', required: false, example: 'created_at' })
  @ApiQuery({ name: 'sortOrder', required: false, example: 'desc', enum: ['asc', 'desc'] })
  async findAll(
    @Request() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('sortBy') sortBy = 'created_at',
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc',
  ) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Admin access only');
    return this.usersService.findAll(+page, +limit, sortBy, sortOrder);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Put(':id')
  @ApiOperation({ summary: 'Admin: Update user' })
  @ApiParam({ name: 'id', type: Number })
  async updateAdmin(@Request() req: any, @Param('id') id: string, @Body() data: UpdateUserDto) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Admin access only');
    return this.usersService.update(+id, data);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: Delete user' })
  @ApiParam({ name: 'id', type: Number })
  async removeAdmin(@Request() req: any, @Param('id') id: string) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Admin access only');
    return this.usersService.remove(+id);
  }
}
