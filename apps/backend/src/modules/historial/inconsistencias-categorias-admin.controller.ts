import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { InconsistenciasCategoriasService } from './inconsistencias-categorias.service';
import { CreateInconsistenciaCategoriaDto } from './dto/create-inconsistencia-categoria.dto';
import { UpdateInconsistenciaCategoriaDto } from './dto/update-inconsistencia-categoria.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/admin/inconsistencias-categorias')
export class InconsistenciasCategoriasAdminController {
  constructor(private readonly service: InconsistenciasCategoriasService) {}

  @Get()
  list(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive !== 'false';
    return this.service.list(include);
  }

  @Post()
  create(@Body() dto: CreateInconsistenciaCategoriaDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateInconsistenciaCategoriaDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
