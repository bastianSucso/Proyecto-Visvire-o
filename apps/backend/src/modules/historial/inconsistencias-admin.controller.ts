import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { HistorialService } from './historial.service';
import { CreateInconsistenciaAdminDto } from './dto/create-inconsistencia-admin.dto';
import { CreateIncidenciaBitacoraDto } from './dto/create-incidencia-bitacora.dto';
import { CambiarEstadoIncidenciaDto } from './dto/cambiar-estado-incidencia.dto';
import { ResolverInconsistenciaConAjusteDto } from './dto/resolver-inconsistencia-con-ajuste.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/admin/inconsistencias')
export class InconsistenciasAdminController {
  constructor(private readonly historialService: HistorialService) {}

  @Post()
  crear(@Body() dto: CreateInconsistenciaAdminDto, @Req() req: any) {
    return this.historialService.crearInconsistenciaAdmin(dto, req.user.idUsuario);
  }

  @Get()
  listar(
    @Query('estado') estado?: any,
    @Query('tipo') tipo?: any,
    @Query('contexto') contexto?: any,
    @Query('productoId') productoId?: string,
    @Query('sesionCajaId') sesionCajaId?: string,
    @Query('fecha') fecha?: string,
  ) {
    return this.historialService.listarInconsistenciasAdmin({
      estado,
      tipo,
      contexto,
      productoId,
      sesionCajaId: sesionCajaId ? Number(sesionCajaId) : undefined,
      fecha,
    });
  }

  @Get('perdidas/resumen')
  resumenPerdidas(@Query('from') from?: string, @Query('to') to?: string) {
    return this.historialService.obtenerResumenPerdidas({ from, to });
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.historialService.obtenerDetalleInconsistencia(id);
  }

  @Post(':id/bitacora')
  crearBitacora(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateIncidenciaBitacoraDto,
    @Req() req: any,
  ) {
    return this.historialService.agregarBitacora(id, dto, req.user.idUsuario);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CambiarEstadoIncidenciaDto,
    @Req() req: any,
  ) {
    return this.historialService.cambiarEstado(id, dto, req.user.idUsuario);
  }

  @Post(':id/resolver-con-ajuste')
  resolverConAjuste(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverInconsistenciaConAjusteDto,
    @Req() req: any,
  ) {
    return this.historialService.resolverConAjuste(id, dto, req.user.idUsuario);
  }
}
