// AxonClaw - Service Layer Base Class
// 参考 AxonClawX services 架构

export class BaseService {
  protected gatewayClient: any;

  constructor(gatewayClient: any) {
    this.gatewayClient = gatewayClient;
  }

  protected async call<T>(method: string, params: any = {}): Promise<T> {
    return this.gatewayClient.call(method, params);
  }

  protected emit(event: string, data?: any): void {
    this.gatewayClient.emit(event, data);
  }
}
