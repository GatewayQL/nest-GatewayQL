import { Injectable } from '@nestjs/common';
import { ConditionDefinition } from '../interfaces/plugin.interface';

/**
 * Condition Registry - manages all registered conditions
 */
@Injectable()
export class ConditionRegistry {
  private conditions: Map<string, ConditionDefinition> = new Map();

  /**
   * Register a new condition
   */
  register(condition: ConditionDefinition): void {
    if (this.conditions.has(condition.name)) {
      throw new Error(`Condition '${condition.name}' is already registered`);
    }
    this.conditions.set(condition.name, condition);
  }

  /**
   * Get condition by name
   */
  get(name: string): ConditionDefinition | undefined {
    return this.conditions.get(name);
  }

  /**
   * Check if condition exists
   */
  has(name: string): boolean {
    return this.conditions.has(name);
  }

  /**
   * Get all registered conditions
   */
  getAll(): ConditionDefinition[] {
    return Array.from(this.conditions.values());
  }

  /**
   * Get all condition names
   */
  getAllNames(): string[] {
    return Array.from(this.conditions.keys());
  }

  /**
   * Unregister a condition
   */
  unregister(name: string): boolean {
    return this.conditions.delete(name);
  }

  /**
   * Clear all conditions
   */
  clear(): void {
    this.conditions.clear();
  }
}
