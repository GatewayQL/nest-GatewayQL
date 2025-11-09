import { Injectable } from '@nestjs/common';
import {
  GraphQLHookDefinition,
  GraphQLHookType,
} from '../interfaces/plugin.interface';

/**
 * GraphQL Hook Registry - manages all registered GraphQL hooks
 */
@Injectable()
export class GraphQLHookRegistry {
  private hooks: Map<GraphQLHookType, GraphQLHookDefinition[]> = new Map();

  /**
   * Register a new GraphQL hook
   */
  register(hook: GraphQLHookDefinition): void {
    const existing = this.hooks.get(hook.type) || [];
    existing.push(hook);

    // Sort by priority (lower = earlier execution)
    existing.sort((a, b) => (a.priority || 100) - (b.priority || 100));

    this.hooks.set(hook.type, existing);
  }

  /**
   * Get hooks by type
   */
  getByType(type: GraphQLHookType): GraphQLHookDefinition[] {
    return this.hooks.get(type) || [];
  }

  /**
   * Get all hooks
   */
  getAll(): GraphQLHookDefinition[] {
    const allHooks: GraphQLHookDefinition[] = [];
    for (const hooks of this.hooks.values()) {
      allHooks.push(...hooks);
    }
    return allHooks;
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
  }

  /**
   * Clear hooks by type
   */
  clearByType(type: GraphQLHookType): void {
    this.hooks.delete(type);
  }
}
