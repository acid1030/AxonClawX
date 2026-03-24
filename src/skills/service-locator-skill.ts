/**
 * Service Locator Skill - ACE Service Discovery
 * 
 * Features:
 * 1. Service Registration
 * 2. Service Lookup
 * 3. Service Lifecycle Management
 * 
 * @module service-locator-skill
 */

export interface ServiceMetadata {
  name: string;
  version: string;
  endpoint?: string;
  healthCheck?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ServiceInstance {
  id: string;
  service: ServiceMetadata;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
  registeredAt: number;
  lastHeartbeat: number;
  ttl: number; // Time to live in ms
}

export interface ServiceLocatorConfig {
  heartbeatInterval: number; // ms
  defaultTTL: number; // ms
  cleanupInterval: number; // ms
}

export class ServiceLocator {
  private services: Map<string, ServiceInstance[]> = new Map();
  private config: ServiceLocatorConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<ServiceLocatorConfig> = {}) {
    this.config = {
      heartbeatInterval: config.heartbeatInterval || 5000,
      defaultTTL: config.defaultTTL || 30000,
      cleanupInterval: config.cleanupInterval || 10000,
    };
    
    this.startCleanup();
  }

  /**
   * Register a service instance
   */
  register(service: ServiceMetadata, instanceId?: string): ServiceInstance {
    const id = instanceId || `${service.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    
    const instance: ServiceInstance = {
      id,
      service,
      status: 'starting',
      registeredAt: now,
      lastHeartbeat: now,
      ttl: this.config.defaultTTL,
    };

    // Mark as healthy after brief delay (simulating startup)
    setTimeout(() => {
      instance.status = 'healthy';
    }, 100);

    const serviceName = service.name.toLowerCase();
    const instances = this.services.get(serviceName) || [];
    instances.push(instance);
    this.services.set(serviceName, instances);

    console.log(`[ServiceLocator] Registered: ${id} (${service.name})`);
    return instance;
  }

  /**
   * Deregister a service instance
   */
  deregister(instanceId: string): boolean {
    for (const [serviceName, instances] of this.services.entries()) {
      const index = instances.findIndex(inst => inst.id === instanceId);
      if (index !== -1) {
        instances[index].status = 'stopping';
        setTimeout(() => {
          instances.splice(index, 1);
          if (instances.length === 0) {
            this.services.delete(serviceName);
          }
        }, 500);
        console.log(`[ServiceLocator] Deregistered: ${instanceId}`);
        return true;
      }
    }
    return false;
  }

  /**
   * Find services by name
   */
  find(serviceName: string, options?: { healthyOnly?: boolean; tags?: string[] }): ServiceInstance[] {
    const name = serviceName.toLowerCase();
    const instances = this.services.get(name);
    
    if (!instances) {
      return [];
    }

    let filtered = instances;

    if (options?.healthyOnly) {
      filtered = filtered.filter(inst => inst.status === 'healthy');
    }

    if (options?.tags && options.tags.length > 0) {
      filtered = filtered.filter(inst => 
        inst.service.tags?.some(tag => options!.tags!.includes(tag))
      );
    }

    return filtered;
  }

  /**
   * Get a single healthy instance (for load balancing)
   */
  getInstance(serviceName: string): ServiceInstance | null {
    const instances = this.find(serviceName, { healthyOnly: true });
    if (instances.length === 0) {
      return null;
    }
    // Simple round-robin: pick first healthy instance
    return instances[0];
  }

  /**
   * Update heartbeat for an instance
   */
  heartbeat(instanceId: string): boolean {
    for (const instances of this.services.values()) {
      const instance = instances.find(inst => inst.id === instanceId);
      if (instance) {
        instance.lastHeartbeat = Date.now();
        instance.status = 'healthy';
        return true;
      }
    }
    return false;
  }

  /**
   * List all registered services
   */
  listServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Get all instances of a service
   */
  getAllInstances(serviceName: string): ServiceInstance[] {
    return this.services.get(serviceName.toLowerCase()) || [];
  }

  /**
   * Get service statistics
   */
  getStats(): { totalServices: number; totalInstances: number; byStatus: Record<string, number> } {
    const byStatus: Record<string, number> = {};
    let totalInstances = 0;

    for (const instances of this.services.values()) {
      totalInstances += instances.length;
      for (const inst of instances) {
        byStatus[inst.status] = (byStatus[inst.status] || 0) + 1;
      }
    }

    return {
      totalServices: this.services.size,
      totalInstances,
      byStatus,
    };
  }

  /**
   * Cleanup expired instances
   */
  private cleanup() {
    const now = Date.now();
    
    for (const [serviceName, instances] of this.services.entries()) {
      const expired = instances.filter(inst => now - inst.lastHeartbeat > inst.ttl);
      
      for (const inst of expired) {
        console.log(`[ServiceLocator] Cleanup expired: ${inst.id} (${serviceName})`);
        inst.status = 'unhealthy';
      }

      const healthy = instances.filter(inst => now - inst.lastHeartbeat <= inst.ttl);
      
      if (healthy.length === 0) {
        this.services.delete(serviceName);
      } else {
        this.services.set(serviceName, healthy);
      }
    }
  }

  private startCleanup() {
    this.cleanupTimer = setInterval(() => this.cleanup(), this.config.cleanupInterval);
  }

  /**
   * Stop the service locator
   */
  destroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.services.clear();
  }
}

// Singleton instance
let serviceLocator: ServiceLocator | null = null;

export function getServiceLocator(config?: Partial<ServiceLocatorConfig>): ServiceLocator {
  if (!serviceLocator) {
    serviceLocator = new ServiceLocator(config);
  }
  return serviceLocator;
}

export function resetServiceLocator() {
  if (serviceLocator) {
    serviceLocator.destroy();
    serviceLocator = null;
  }
}

/**
 * Usage Examples:
 * 
 * // Initialize
 * const locator = getServiceLocator();
 * 
 * // Register services
 * locator.register({
 *   name: 'user-service',
 *   version: '1.0.0',
 *   endpoint: 'http://localhost:3001',
 *   tags: ['api', 'users']
 * });
 * 
 * locator.register({
 *   name: 'user-service',
 *   version: '1.0.0',
 *   endpoint: 'http://localhost:3002',
 *   tags: ['api', 'users']
 * });
 * 
 * // Find services
 * const instances = locator.find('user-service', { healthyOnly: true });
 * 
 * // Get single instance
 * const instance = locator.getInstance('user-service');
 * 
 * // Heartbeat
 * locator.heartbeat(instance.id);
 * 
 * // Deregister
 * locator.deregister(instance.id);
 * 
 * // List all services
 * const services = locator.listServices();
 * 
 * // Get stats
 * const stats = locator.getStats();
 */
