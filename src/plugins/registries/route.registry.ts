import { Injectable } from '@nestjs/common';
import { RouteDefinition } from '../interfaces/plugin.interface';

/**
 * Route Registry - manages all registered routes from plugins
 */
@Injectable()
export class RouteRegistry {
  private routes: RouteDefinition[] = [];

  /**
   * Register a new route
   */
  register(route: RouteDefinition): void {
    // Check for duplicate routes
    const existing = this.routes.find(
      (r) => r.method === route.method && r.path === route.path,
    );
    if (existing) {
      throw new Error(
        `Route ${route.method} ${route.path} is already registered`,
      );
    }
    this.routes.push(route);
  }

  /**
   * Get all registered routes
   */
  getAll(): RouteDefinition[] {
    return [...this.routes];
  }

  /**
   * Get routes by method
   */
  getByMethod(method: string): RouteDefinition[] {
    return this.routes.filter(
      (r) => r.method.toLowerCase() === method.toLowerCase(),
    );
  }

  /**
   * Get routes by path pattern
   */
  getByPath(path: string): RouteDefinition[] {
    return this.routes.filter((r) => r.path === path);
  }

  /**
   * Clear all routes
   */
  clear(): void {
    this.routes = [];
  }
}
