/**
 * Service Locator Skill - Usage Examples
 * 
 * This file demonstrates how to use the ACE Service Locator
 */

import { 
  getServiceLocator, 
  resetServiceLocator,
  ServiceMetadata 
} from './service-locator-skill';

// ============================================
// Example 1: Basic Service Registration
// ============================================

function example1_BasicRegistration() {
  console.log('\n=== Example 1: Basic Service Registration ===\n');
  
  const locator = getServiceLocator();
  
  // Register a simple service
  const service1 = locator.register({
    name: 'payment-service',
    version: '1.0.0',
    endpoint: 'http://localhost:3001',
  });
  
  console.log('Registered service:', service1.id);
  console.log('Status:', service1.status);
}

// ============================================
// Example 2: Service Discovery
// ============================================

function example2_ServiceDiscovery() {
  console.log('\n=== Example 2: Service Discovery ===\n');
  
  const locator = getServiceLocator();
  
  // Register multiple instances
  locator.register({
    name: 'order-service',
    version: '2.0.0',
    endpoint: 'http://localhost:3002',
    tags: ['api', 'orders', 'v2']
  });
  
  locator.register({
    name: 'order-service',
    version: '2.0.0',
    endpoint: 'http://localhost:3003',
    tags: ['api', 'orders', 'v2']
  });
  
  // Find all instances
  const allInstances = locator.find('order-service');
  console.log('All instances:', allInstances.length);
  
  // Find healthy instances only
  const healthyInstances = locator.find('order-service', { healthyOnly: true });
  console.log('Healthy instances:', healthyInstances.length);
  
  // Get single instance (for load balancing)
  const instance = locator.getInstance('order-service');
  console.log('Selected instance:', instance?.id);
}

// ============================================
// Example 3: Service with Metadata
// ============================================

function example3_ServiceWithMetadata() {
  console.log('\n=== Example 3: Service with Metadata ===\n');
  
  const locator = getServiceLocator();
  
  // Register service with rich metadata
  locator.register({
    name: 'notification-service',
    version: '1.5.0',
    endpoint: 'http://localhost:3004',
    healthCheck: 'http://localhost:3004/health',
    tags: ['async', 'notifications', 'email', 'sms'],
    metadata: {
      region: 'us-east-1',
      capacity: 1000,
      protocols: ['smtp', 'twilio'],
      priority: 'high'
    }
  });
  
  // Find by tags
  const emailServices = locator.find('notification-service', { 
    tags: ['email'] 
  });
  console.log('Email notification services:', emailServices.length);
  
  // Access metadata
  const instance = locator.getInstance('notification-service');
  if (instance) {
    console.log('Service region:', instance.service.metadata?.region);
    console.log('Supported protocols:', instance.service.metadata?.protocols);
  }
}

// ============================================
// Example 4: Heartbeat & Lifecycle
// ============================================

async function example4_HeartbeatLifecycle() {
  console.log('\n=== Example 4: Heartbeat & Lifecycle ===\n');
  
  const locator = getServiceLocator();
  
  // Register a service
  const service = locator.register({
    name: 'cache-service',
    version: '1.0.0',
    endpoint: 'http://localhost:6379',
    tags: ['cache', 'redis']
  });
  
  console.log('Initial status:', service.status);
  
  // Simulate heartbeat
  setTimeout(() => {
    locator.heartbeat(service.id);
    console.log('Heartbeat sent');
  }, 1000);
  
  // Simulate service shutdown
  setTimeout(() => {
    const success = locator.deregister(service.id);
    console.log('Deregistered:', success);
  }, 2000);
  
  // Wait for async operations
  await new Promise(resolve => setTimeout(resolve, 2500));
}

// ============================================
// Example 5: Service Statistics
// ============================================

function example5_ServiceStats() {
  console.log('\n=== Example 5: Service Statistics ===\n');
  
  const locator = getServiceLocator();
  
  // Register multiple services
  const services = [
    { name: 'auth-service', endpoint: 'http://localhost:3001' },
    { name: 'auth-service', endpoint: 'http://localhost:3002' },
    { name: 'user-service', endpoint: 'http://localhost:3003' },
    { name: 'user-service', endpoint: 'http://localhost:3004' },
    { name: 'user-service', endpoint: 'http://localhost:3005' },
    { name: 'payment-service', endpoint: 'http://localhost:3006' },
  ];
  
  services.forEach(svc => locator.register(svc));
  
  // Get statistics
  const stats = locator.getStats();
  console.log('Total services:', stats.totalServices);
  console.log('Total instances:', stats.totalInstances);
  console.log('By status:', stats.byStatus);
  
  // List all service names
  const serviceNames = locator.listServices();
  console.log('Registered services:', serviceNames);
}

// ============================================
// Example 6: Custom Configuration
// ============================================

function example6_CustomConfig() {
  console.log('\n=== Example 6: Custom Configuration ===\n');
  
  // Reset existing locator
  resetServiceLocator();
  
  // Create with custom config
  const locator = getServiceLocator({
    heartbeatInterval: 3000,      // 3 seconds
    defaultTTL: 15000,            // 15 seconds
    cleanupInterval: 5000,        // 5 seconds
  });
  
  locator.register({
    name: 'fast-service',
    version: '1.0.0',
    endpoint: 'http://localhost:4000',
  });
  
  console.log('Service registered with custom TTL config');
  console.log('Cleanup interval: 5000ms');
}

// ============================================
// Example 7: Real-world Microservices Scenario
// ============================================

async function example7_MicroservicesScenario() {
  console.log('\n=== Example 7: Real-world Microservices Scenario ===\n');
  
  resetServiceLocator();
  const locator = getServiceLocator();
  
  // Simulate microservices architecture
  const microservices = [
    { name: 'api-gateway', version: '1.0.0', endpoint: 'http://gateway:8080', tags: ['gateway', 'public'] },
    { name: 'user-service', version: '2.1.0', endpoint: 'http://user-svc:3001', tags: ['internal', 'users'] },
    { name: 'user-service', version: '2.1.0', endpoint: 'http://user-svc:3002', tags: ['internal', 'users'] },
    { name: 'order-service', version: '1.5.0', endpoint: 'http://order-svc:3003', tags: ['internal', 'orders'] },
    { name: 'order-service', version: '1.5.0', endpoint: 'http://order-svc:3004', tags: ['internal', 'orders'] },
    { name: 'order-service', version: '1.5.0', endpoint: 'http://order-svc:3005', tags: ['internal', 'orders'] },
    { name: 'payment-service', version: '3.0.0', endpoint: 'http://payment-svc:3006', tags: ['internal', 'payments', 'critical'] },
    { name: 'notification-service', version: '1.2.0', endpoint: 'http://notify-svc:3007', tags: ['async', 'notifications'] },
    { name: 'cache-service', version: '1.0.0', endpoint: 'redis://cache:6379', tags: ['infrastructure', 'cache'] },
  ];
  
  console.log('Registering microservices...\n');
  microservices.forEach(svc => {
    const instance = locator.register(svc);
    console.log(`✓ ${svc.name} (${instance.id.substr(0, 20)}...)`);
  });
  
  console.log('\n--- Service Discovery ---');
  
  // API Gateway needs to find user service
  const userInstances = locator.find('user-service', { healthyOnly: true });
  console.log(`User Service instances available: ${userInstances.length}`);
  
  // Order service needs payment service
  const paymentInstance = locator.getInstance('payment-service');
  console.log(`Payment Service endpoint: ${paymentInstance?.service.endpoint}`);
  
  // Find all critical services
  const criticalServices = locator.find('payment-service', { tags: ['critical'] });
  console.log(`Critical services: ${criticalServices.length}`);
  
  console.log('\n--- System Statistics ---');
  const stats = locator.getStats();
  console.log(`Total Services: ${stats.totalServices}`);
  console.log(`Total Instances: ${stats.totalInstances}`);
  console.log(`Health Status:`, stats.byStatus);
}

// ============================================
// Run All Examples
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║  ACE Service Locator - Usage Examples     ║');
  console.log('╚════════════════════════════════════════════╝');
  
  try {
    example1_BasicRegistration();
    example2_ServiceDiscovery();
    example3_ServiceWithMetadata();
    await example4_HeartbeatLifecycle();
    example5_ServiceStats();
    example6_CustomConfig();
    await example7_MicroservicesScenario();
    
    console.log('\n✅ All examples completed successfully!\n');
  } catch (error) {
    console.error('❌ Example failed:', error);
  } finally {
    // Cleanup
    resetServiceLocator();
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
