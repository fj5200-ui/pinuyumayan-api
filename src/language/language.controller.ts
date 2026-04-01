import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LanguageService } from './language.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@ApiTags('Language')
@Controller('language')
export class LanguageController {
  constructor(private languageService: LanguageService) {}

  @Get('vocabulary')
  @ApiOperation({ summary: '取得詞彙列表' })
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string, @Query('category') category?: string) {
    return this.languageService.findAll(parseInt(page || '1'), parseInt(limit || '20'), category);
  }

  @Get('daily')
  @ApiOperation({ summary: '取得每日一詞' })
  async getDaily() { return this.languageService.getDaily(); }

  @Get('categories')
  @ApiOperation({ summary: '取得詞彙分類' })
  async getCategories() { return this.languageService.getCategories(); }

  @Get('vocabulary/:id')
  @ApiOperation({ summary: '取得單一詞彙' })
  async findOne(@Param('id', ParseIntPipe) id: number) { return this.languageService.findOne(id); }

  @Post('vocabulary')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: '新增詞彙' })
  async create(@Body() body: any) { return this.languageService.create(body); }

  @Put('vocabulary/:id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: '更新詞彙' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.languageService.update(id, body); }

  @Delete('vocabulary/:id')
  @UseGuards(JwtAuthGuard) @ApiBearerAuth()
  @ApiOperation({ summary: '刪除詞彙' })
  async remove(@Param('id', ParseIntPipe) id: number) { return this.languageService.remove(id); }
}
