import { Body, Controller, Get, Post } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    if (body.email === 'admin@citysquare.local' && body.password === 'admin123') {
      return {
        user: {
          id: 'b7e1e1b4-8a63-4f2d-a5ea-6d543ea4c22d',
          name: 'City Square Admin',
          role: 'ADMIN',
        },
        token: 'demo-token-citysquare',
      };
    }

    return {
      status: 'invalid_credentials',
      message: 'Incorrect email or password',
    };
  }

  @Get('me')
  me() {
    return {
      id: 'b7e1e1b4-8a63-4f2d-a5ea-6d543ea4c22d',
      name: 'City Square Admin',
      role: 'ADMIN',
      permissions: ['orders:read', 'orders:write', 'payments:read', 'reports:read'],
    };
  }
}
