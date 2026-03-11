import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
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
import { ResolverInconsistenciaDto } from './dto/resolver-inconsistencia.dto';

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

  @Get('sesion-activa')
  sesionActiva() {
    return this.historialService.obtenerSesionActivaAdmin();
  }

  @Get(':id')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.historialService.obtenerDetalleInconsistencia(id);
  }

  @Post(':id/resolver')
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverInconsistenciaDto,
    @Req() req: any,
  ) {
    return this.historialService.resolverInconsistencia(id, dto, req.user.idUsuario);
  }
}
