import { Controller, Get, Header } from '@nestjs/common';
import { PrometheusController as BasePrometheusController } from '@willsoto/nestjs-prometheus';

@Controller('metrics')
export class MetricsController extends BasePrometheusController {
  @Get()
  @Header('Content-Type', 'text/plain')
  async index() {
    return super.index();
  }
}
