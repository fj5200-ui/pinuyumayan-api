import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { JwtAuthGuard } from '../common/jwt-auth.guard';

@ApiTags('Articles')
@Controller('articles')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Get()
  @ApiOperation({ summary: '取得文章列表' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.articlesService.findAll(
      parseInt(page || '1'), parseInt(limit || '12'), category, search,
    );
  }

  @Get('meta/categories')
  @ApiOperation({ summary: '取得文章分類統計' })
  async getCategories() {
    return this.articlesService.getCategories();
  }

  @Get('meta/related/:id')
  @ApiOperation({ summary: '取得相關文章推薦' })
  async getRelated(@Param('id', ParseIntPipe) id: number, @Query('limit') limit?: string) {
    return this.articlesService.getRelated(id, parseInt(limit || '3'));
  }

  @Get('meta/sitemap')
  @ApiOperation({ summary: '取得 Sitemap 資料' })
  async getSitemap() {
    return this.articlesService.getSitemapData();
  }

  @Get(':slug')
  @ApiOperation({ summary: '取得單篇文章' })
  async findOne(@Param('slug') slug: string) {
    return this.articlesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '新增文章' })
  async create(@Body() body: any, @Req() req: any) {
    return this.articlesService.create(body, req.user.id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新文章' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: any, @Req() req: any) {
    return this.articlesService.update(id, body, req.user.id, req.user.role);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '刪除文章' })
  async remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.articlesService.remove(id, req.user.id, req.user.role);
  }
}
