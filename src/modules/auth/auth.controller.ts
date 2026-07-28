import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('update-password')
  @UseGuards(JwtAuthGuard) // Cualquiera con token válido puede acceder a su propio cambio de clave
  async updatePassword(@Request() req: any, @Body() updatePasswordDto: UpdatePasswordDto) {
    return this.authService.updatePassword(req.user.sub, updatePasswordDto);
  }


  @Get('profile')
  @UseGuards(JwtAuthGuard) // Protegido: requiere token válido
  async getProfile(@Request() req: any) {
    // Extraemos el sub (id del usuario) que el Guardia inyectó en el token
    return this.authService.getProfile(req.user.sub);
  }
}