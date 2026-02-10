import { Injectable } from '@nestjs/common';
import express from 'express';
import path from 'path';
import { ConfigService } from '@nestjs/config';
import type { NestMiddleware } from '@nestjs/common';
import type { AppConfig } from '~/interface/config';

@Injectable()
export class GuiMiddleware implements NestMiddleware {
  constructor(private configService: ConfigService<AppConfig>) {}

  use(req: any, res: any, next: () => void) {
    const dashboardPath = this.configService.get('dashboardPath', {
      infer: true,
    });
    const router = express.Router();
    router.use(
      dashboardPath,
      express.static(path.join(__dirname, 'nc-gui')),
    );
    router(req, res, next);
  }
}
