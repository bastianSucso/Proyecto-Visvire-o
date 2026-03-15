import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { UnidadesMedidaService } from './unidades-medida.service';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';
import { SetUnidadMedidaActiveDto } from './dto/set-unidad-medida-active.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/unidades')
export class UnidadesMedidaController {
  constructor(private readonly unidadesService: UnidadesMedidaService) {}

  @Get()
  @Roles('ADMIN')
  list(@Query('includeInactive') includeInactive?: string) {
    return this.unidadesService.list(includeInactive === 'true');
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUnidadMedidaDto) {
    return this.unidadesService.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  updateNombre(@Param('id') id: string, @Body() dto: UpdateUnidadMedidaDto) {
    return this.unidadesService.updateNombre(id, dto);
  }

  @Patch(':id/active')
  @Roles('ADMIN')
  setActive(@Param('id') id: string, @Body() dto: SetUnidadMedidaActiveDto) {
    return this.unidadesService.setActive(id, dto.isActive);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.unidadesService.remove(id);
  }
}
