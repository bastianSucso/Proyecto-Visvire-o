import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { FinanzasService } from './finanzas.service';
import { CreateIngresoExternoDto } from './dto/create-ingreso-externo.dto';
import { CreateEgresoManualDto } from './dto/create-egreso-manual.dto';
import { ListarMovimientosFinancierosDto } from './dto/listar-movimientos-financieros.dto';
import { ConsultarPeriodoFinancieroDto } from './dto/consultar-periodo-financiero.dto';
import { UpdateMovimientoManualDto } from './dto/update-movimiento-manual.dto';
import { AnularMovimientoFinancieroDto } from './dto/anular-movimiento-financiero.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/finanzas')
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Post('ingresos-externos')
  registrarIngresoExterno(@Body() dto: CreateIngresoExternoDto, @Req() req: any) {
    return this.finanzasService.registrarIngresoExterno(dto, req.user.idUsuario);
  }

  @Get('ingresos-externos')
  listarIngresosExternos(@Query() query: ListarMovimientosFinancierosDto) {
    return this.finanzasService.listarIngresosExternos(query);
  }

  @Post('egresos-manuales')
  registrarEgresoManual(@Body() dto: CreateEgresoManualDto, @Req() req: any) {
    return this.finanzasService.registrarEgresoManual(dto, req.user.idUsuario);
  }

  @Get('egresos-manuales')
  listarEgresosManuales(@Query() query: ListarMovimientosFinancierosDto) {
    return this.finanzasService.listarEgresosManuales(query);
  }

  @Get('movimientos')
  listarMovimientos(@Query() query: ListarMovimientosFinancierosDto) {
    return this.finanzasService.listarMovimientos(query);
  }

  @Patch('movimientos/:id')
  actualizarMovimientoManual(@Param('id') id: string, @Body() dto: UpdateMovimientoManualDto) {
    return this.finanzasService.actualizarMovimientoManual(id, dto);
  }

  @Delete('movimientos/:id')
  anularMovimientoManual(@Param('id') id: string, @Body() dto: AnularMovimientoFinancieroDto, @Req() req: any) {
    return this.finanzasService.anularMovimientoManual(id, req.user.idUsuario, dto?.motivo);
  }

  @Get('iva')
  obtenerIva(@Query() query: ConsultarPeriodoFinancieroDto) {
    return this.finanzasService.obtenerIva(query);
  }

  @Get('resumen')
  obtenerResumen(@Query() query: ConsultarPeriodoFinancieroDto) {
    return this.finanzasService.obtenerResumen(query);
  }
}
