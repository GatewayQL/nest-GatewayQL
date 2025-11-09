import { Injectable } from '@nestjs/common';
import { PolicyDefinition, PolicyHandler } from '../interfaces/plugin.interface';

/**
 * Policy Registry - manages all registered policies
 */
@Injectable()
export class PolicyRegistry {
  private policies: Map<string, PolicyDefinition> = new Map();

  /**
   * Register a new policy
   */
  register(policy: PolicyDefinition): void {
    if (this.policies.has(policy.name)) {
      throw new Error(`Policy '${policy.name}' is already registered`);
    }
    this.policies.set(policy.name, policy);
  }

  /**
   * Get policy by name
   */
  get(name: string): PolicyDefinition | undefined {
    return this.policies.get(name);
  }

  /**
   * Check if policy exists
   */
  has(name: string): boolean {
    return this.policies.has(name);
  }

  /**
   * Get all registered policies
   */
  getAll(): PolicyDefinition[] {
    return Array.from(this.policies.values());
  }

  /**
   * Get all policy names
   */
  getAllNames(): string[] {
    return Array.from(this.policies.keys());
  }

  /**
   * Unregister a policy
   */
  unregister(name: string): boolean {
    return this.policies.delete(name);
  }

  /**
   * Clear all policies
   */
  clear(): void {
    this.policies.clear();
  }
}
