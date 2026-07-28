import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { SkipPasswordCheck } from '../../common/decorators/skip-password-check.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @SkipPasswordCheck()
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('update-password')
  @UseGuards(JwtAuthGuard)
  @SkipPasswordCheck()
  async updatePassword(@Request() req: any, @Body() updatePasswordDto: UpdatePasswordDto) {
    return this.authService.updatePassword(req.user.sub, updatePasswordDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.sub);
  }
}
