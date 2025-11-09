import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Options,
  Head,
  All,
  Req,
  Res,
  Next,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RouteRegistry } from './registries/route.registry';
import { CustomLoggerService } from '../common/logger/logger.service';

/**
 * Plugin Controller - handles dynamic routes registered by plugins
 */
@Controller('plugin')
export class PluginController {
  constructor(
    private readonly routeRegistry: RouteRegistry,
    private readonly logger: CustomLoggerService,
  ) {
    this.logger.setContext('PluginController');
  }

  /**
   * Handle all plugin routes
   * This is a fallback - ideally routes should be registered dynamically
   */
  @All('*')
  async handlePluginRoute(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    const routes = this.routeRegistry.getAll();
    const matchedRoute = routes.find(
      (route) =>
        route.method === req.method &&
        this.matchPath(route.path, req.path.replace('/plugin', '')),
    );

    if (matchedRoute) {
      try {
        // Execute middleware if present
        if (matchedRoute.middleware && matchedRoute.middleware.length > 0) {
          for (const middleware of matchedRoute.middleware) {
            await new Promise<void>((resolve, reject) => {
              middleware(req, res, (error?: any) => {
                if (error) reject(error);
                else resolve();
              });
            });
          }
        }

        // Execute handler
        const result = await matchedRoute.handler(req, res);

        if (!res.headersSent) {
          res.json(result);
        }
      } catch (error) {
        this.logger.error(
          `Error handling plugin route: ${error.message}`,
          error.stack,
        );
        if (!res.headersSent) {
          res.status(500).json({
            error: 'Internal Server Error',
            message: error.message,
          });
        }
      }
    } else {
      next();
    }
  }

  /**
   * Simple path matching
   */
  private matchPath(pattern: string, path: string): boolean {
    // Simple exact match for now
    // Can be enhanced with path-to-regexp for pattern matching
    return pattern === path || pattern === `/${path}`;
  }
}
