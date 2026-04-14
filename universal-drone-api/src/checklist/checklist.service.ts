import { Injectable, Inject, NotFoundException, OnModuleInit } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { checklistTemplates, checklistItems, checklistRuns } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class ChecklistService implements OnModuleInit {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultTemplate();
  }

  async findTemplates() {
    return this.db.select().from(checklistTemplates);
  }

  async findTemplateItems(templateId: number) {
    return this.db.select().from(checklistItems)
      .where(eq(checklistItems.templateId, templateId))
      .orderBy(checklistItems.sequence);
  }

  async createTemplate(data: any, userId?: number) {
    const [t] = await this.db.insert(checklistTemplates).values({
      name: data.name,
      droneModel: data.droneModel,
      isDefault: data.isDefault ?? false,
      createdById: userId || null,
    }).returning();
    return t;
  }

  async addItem(templateId: number, data: any) {
    const [item] = await this.db.insert(checklistItems).values({
      templateId,
      sequence:    data.sequence,
      label:       data.label,
      description: data.description,
      isRequired:  data.isRequired ?? true,
    }).returning();
    return item;
  }

  async runChecklist(dto: {
    templateId: number;
    droneId: number;
    missionId?: number;
    userId: number;
    results: Array<{ itemId: number; passed: boolean; notes?: string }>;
  }) {
    const items = await this.findTemplateItems(dto.templateId);
    const requiredItems = items.filter(i => i.isRequired);
    const allPassed = requiredItems.every(item =>
      dto.results.find(r => r.itemId === item.id)?.passed === true,
    );

    const [run] = await this.db.insert(checklistRuns).values({
      templateId:    dto.templateId,
      droneId:       dto.droneId,
      missionId:     dto.missionId || null,
      performedById: dto.userId,
      resultsJson:   JSON.stringify(dto.results),
      allPassed,
    }).returning();

    return { ...run, allPassed, summary: allPassed ? '全部通過' : '有項目未通過，請確認後再起飛' };
  }

  async getRunsByDrone(droneId: number) {
    return this.db.select().from(checklistRuns)
      .where(eq(checklistRuns.droneId, droneId))
      .orderBy(checklistRuns.performedAt);
  }

  private async seedDefaultTemplate() {
    const existing = await this.db.select().from(checklistTemplates)
      .where(eq(checklistTemplates.isDefault, true)).limit(1);
    if (existing.length > 0) return;

    const [template] = await this.db.insert(checklistTemplates).values({
      name: '通用飛前檢查清單',
      isDefault: true,
    }).returning();

    const items = [
      { sequence: 1, label: '電池電量確認（>80%）', description: '確認飛行電池電量大於 80%', isRequired: true },
      { sequence: 2, label: '槳葉安裝確認', description: '確認槳葉鎖緊、無損傷', isRequired: true },
      { sequence: 3, label: '指南針校正', description: '在起飛地點完成指南針校正', isRequired: true },
      { sequence: 4, label: 'GPS 訊號確認（>8 顆衛星）', description: '確認 GPS 定位衛星數量充足', isRequired: true },
      { sequence: 5, label: '遙控器電量確認', description: '確認遙控器電量大於 50%', isRequired: true },
      { sequence: 6, label: '任務區域空域確認', description: '確認任務區域無禁航限制', isRequired: true },
      { sequence: 7, label: '天氣條件確認', description: '確認風速 < 10 m/s，無降雨', isRequired: true },
      { sequence: 8, label: '機體外觀檢查', description: '確認機身無裂痕、螺絲無鬆動', isRequired: false },
      { sequence: 9, label: '韌體版本確認', description: '確認飛控韌體為最新版本', isRequired: false },
    ];

    await this.db.insert(checklistItems).values(
      items.map(item => ({ ...item, templateId: template.id })),
    );
  }
}
