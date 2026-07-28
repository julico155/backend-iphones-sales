import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { SkipPasswordCheck } from './common/decorators/skip-password-check.decorator';

@Controller()
export class AppController {
  @Get('health')
  @SkipThrottle()
  @SkipPasswordCheck()
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
