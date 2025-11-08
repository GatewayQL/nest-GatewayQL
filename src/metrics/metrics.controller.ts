import { Controller, Get, Header, Res } from '@nestjs/common';
import { PrometheusController as BasePrometheusController } from '@willsoto/nestjs-prometheus';
import { Response } from 'express';

@Controller('metrics')
export class MetricsController extends BasePrometheusController {
  @Get()
  @Header('Content-Type', 'text/plain')
  async index(@Res() response: Response) {
    return super.index(response);
  }
}
