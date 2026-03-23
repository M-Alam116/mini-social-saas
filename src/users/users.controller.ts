import { Controller, Get, UseGuards, Request, Put, Delete, Param, Body, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Admin: Get all users list' })
  async findAll(@Request() req: any) {
    if (req.user.role !== 'admin') throw new ForbiddenException('Admin access only');
    return this.usersService.findAll();
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
