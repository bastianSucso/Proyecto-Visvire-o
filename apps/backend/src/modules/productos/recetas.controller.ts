import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RecetasService } from './recetas.service';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/recetas')
export class RecetasController {
  constructor(private readonly service: RecetasService) {}

  @Get()
  list(@Query('comidaId') comidaId?: string) {
    return this.service.list(comidaId ?? '');
  }

  @Get('costos')
  costos(@Query('comidaId') comidaId?: string) {
    return this.service.costos(comidaId ?? '');
  }

  @Post('recalcular-costos')
  recalculateAll() {
    return this.service.recalculateCostosAllComidas();
  }

  @Post()
  create(@Body() dto: CreateRecetaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRecetaDto) {
    return this.service.update(Number(id), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(Number(id));
  }
}
