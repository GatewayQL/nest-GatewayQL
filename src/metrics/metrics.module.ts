import { Module } from '@nestjs/common';
import { PrometheusModule } from '@willsoto/nestjs-prometheus';

@Module({
  imports: [
    PrometheusModule.register({
      defaultMetrics: {
        enabled: true,
        config: {
          prefix: 'nest_gatewayql_',
        },
      },
    }),
  ],
  exports: [PrometheusModule],
})
export class MetricsModule {}
