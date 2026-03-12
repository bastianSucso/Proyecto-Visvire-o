import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { InconsistenciasCategoriasService } from './inconsistencias-categorias.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/inconsistencias-categorias')
export class InconsistenciasCategoriasController {
  constructor(private readonly service: InconsistenciasCategoriasService) {}

  @Get()
  @Roles('ADMIN', 'VENDEDOR')
  listActivas(@Query('includeInactive') includeInactive?: string) {
    const include = includeInactive === 'true';
    return this.service.list(include);
  }
}
