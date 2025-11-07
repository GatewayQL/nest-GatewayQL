import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IntrospectAndCompose } from '@apollo/gateway';

interface ServiceEndpoint {
  name: string;
  url: string;
}

@Injectable()
export class GraphQLConfigService {
  constructor(private configService: ConfigService) {}

  public createGatewayOptions() {
    return {
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: this.serviceList(),
        }),
      },
    };
  }

  serviceList(): ServiceEndpoint[] {
    const serviceEndpoints = this.configService.get<ServiceEndpoint[]>('serviceEndpoints');
    if (Array.isArray(serviceEndpoints)) {
      return serviceEndpoints;
    } else {
      return [{ name: 'default', url: 'http://localhost:3001/graphql' }];
    }
  }
}
