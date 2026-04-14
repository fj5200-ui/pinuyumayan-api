import { Injectable, Inject, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../database/database.module';
import { users } from '../database/schema';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import type * as schema from '../database/schema';

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private db: PostgresJsDatabase<typeof schema>,
    private jwt: JwtService,
  ) {}

  async register(email: string, password: string, name: string, role = 'observer') {
    const existing = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0) {
      throw new ConflictException('此電子郵件已被使用');
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const [user] = await this.db.insert(users).values({
      email,
      password: hashedPassword,
      name,
      role: role as any,
    }).returning();

    const token = this.jwt.sign({ id: user.id, email: user.email, role: user.role });
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(email: string, password: string) {
    const [user] = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!user) throw new UnauthorizedException('電子郵件或密碼錯誤');

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) throw new UnauthorizedException('電子郵件或密碼錯誤');

    const token = this.jwt.sign({ id: user.id, email: user.email, role: user.role });
    const { password: _, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getProfile(userId: number) {
    const [user] = await this.db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.id, userId)).limit(1);
    return user;
  }

  async updateProfile(userId: number, data: { name?: string; avatarUrl?: string }) {
    const updateData: any = { updatedAt: new Date() };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    await this.db.update(users).set(updateData).where(eq(users.id, userId));
    return this.getProfile(userId);
  }
}
