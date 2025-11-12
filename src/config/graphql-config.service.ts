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
    const services = this.serviceList();

    return {
      gateway: {
        supergraphSdl: new IntrospectAndCompose({
          subgraphs: services,
        }),
      },
    };
  }

  serviceList(): ServiceEndpoint[] {
    const serviceEndpoints = this.configService.get<ServiceEndpoint[]>('serviceEndpoints');

    if (Array.isArray(serviceEndpoints)) {
      // If explicitly an empty array, return it as-is
      if (serviceEndpoints.length === 0) {
        return [];
      }

      // Validate and filter service endpoints
      const validServices = serviceEndpoints.filter(service =>
        service &&
        typeof service === 'object' &&
        typeof service.name === 'string' &&
        service.name.trim() !== '' &&
        typeof service.url === 'string' &&
        service.url.trim() !== ''
      );

      // If no valid services found after filtering, return empty array
      if (validServices.length === 0) {
        return [];
      }

      return validServices;
    } else {
      return [];
    }
  }
}
