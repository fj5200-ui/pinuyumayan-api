import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DroneAdapter } from './drone-adapter.interface';

@Injectable()
export class DroneAdapterRegistry {
  private readonly logger = new Logger(DroneAdapterRegistry.name);
  private readonly adapters = new Map<number, DroneAdapter>();

  register(droneId: number, adapter: DroneAdapter): void {
    this.adapters.set(droneId, adapter);
    this.logger.log(`已註冊無人機 #${droneId} 適配器（品牌：${adapter.brand}）`);
  }

  get(droneId: number): DroneAdapter {
    const adapter = this.adapters.get(droneId);
    if (!adapter) {
      throw new NotFoundException(`找不到無人機 #${droneId} 的適配器，請先建立連線`);
    }
    return adapter;
  }

  tryGet(droneId: number): DroneAdapter | undefined {
    return this.adapters.get(droneId);
  }

  unregister(droneId: number): void {
    const adapter = this.adapters.get(droneId);
    if (adapter?.isConnected()) {
      adapter.disconnect().catch(err =>
        this.logger.warn(`斷線時發生錯誤：${err.message}`),
      );
    }
    this.adapters.delete(droneId);
    this.logger.log(`已移除無人機 #${droneId} 適配器`);
  }

  getAll(): Map<number, DroneAdapter> {
    return new Map(this.adapters);
  }

  getConnectedDroneIds(): number[] {
    return Array.from(this.adapters.entries())
      .filter(([, adapter]) => adapter.isConnected())
      .map(([id]) => id);
  }
}
