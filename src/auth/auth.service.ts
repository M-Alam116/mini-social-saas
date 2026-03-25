import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async register(data: any) {
    const existingUser = await this.usersService.findOneByEmail(data.email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersService.create({
      ...data,
      password: hashedPassword,
    });

    const { password, ...result } = user;
    return result;
  }

  async login(email: string, pass: string) {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(
        { ...payload, type: 'access' },
        {
          secret: this.configService.get<string>('JWT_SECRET') || 'secret',
          expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRY') || '1d') as any,
        },
      ),
      refresh_token: this.jwtService.sign(
        { ...payload, type: 'refresh' },
        {
          secret: this.configService.get<string>('JWT_SECRET') || 'secret',
          expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRY') || '7d') as any,
        },
      ),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async refreshToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }
      const newPayload = { sub: payload.sub, email: payload.email, role: payload.role };
      return {
        access_token: this.jwtService.sign(
          { ...newPayload, type: 'access' },
          {
            secret: this.configService.get<string>('JWT_SECRET') || 'secret',
            expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRY') || '1d') as any,
          },
        ),
      };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
