import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { InsumoGruposService } from './insumo-grupos.service';
import { CreateInsumoGrupoDto } from './dto/create-insumo-grupo.dto';
import { UpdateInsumoGrupoDto } from './dto/update-insumo-grupo.dto';
import { CreateInsumoGrupoItemDto } from './dto/create-insumo-grupo-item.dto';
import { UpdateInsumoGrupoItemDto } from './dto/update-insumo-grupo-item.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/insumo-grupos')
export class InsumoGruposController {
  constructor(private readonly service: InsumoGruposService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive !== 'false';
    return this.service.list(include);
  }

  @Post()
  create(@Body() dto: CreateInsumoGrupoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInsumoGrupoDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/items')
  addItem(@Param('id') id: string, @Body() dto: CreateInsumoGrupoItemDto) {
    return this.service.addItem(id, dto);
  }

  @Patch('items/:itemId')
  updateItem(@Param('itemId') itemId: string, @Body() dto: UpdateInsumoGrupoItemDto) {
    return this.service.updateItem(itemId, dto);
  }

  @Delete('items/:itemId')
  removeItem(@Param('itemId') itemId: string) {
    return this.service.removeItem(itemId);
  }
}
