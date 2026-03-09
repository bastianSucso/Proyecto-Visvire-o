import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AnularPagoPersonalDto } from './dto/anular-pago-personal.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreatePagoPersonalDto } from './dto/create-pago-personal.dto';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { ListarPagosDto } from './dto/listar-pagos.dto';
import { ListarTrabajadoresDto } from './dto/listar-trabajadores.dto';
import { SetTrabajadorEstadoDto } from './dto/set-trabajador-estado.dto';
import { UpdatePagoPersonalDto } from './dto/update-pago-personal.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';
import { RrhhService } from './rrhh.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/rrhh')
export class RrhhController {
  constructor(private readonly rrhhService: RrhhService) {}

  @Post('personal')
  crearTrabajador(@Body() dto: CreateTrabajadorDto, @Req() req: any) {
    return this.rrhhService.crearTrabajador(dto, req.user.idUsuario);
  }

  @Get('personal')
  listarTrabajadores(@Query() query: ListarTrabajadoresDto) {
    return this.rrhhService.listarTrabajadores(query);
  }

  @Patch('personal/:id')
  actualizarTrabajador(@Param('id') id: string, @Body() dto: UpdateTrabajadorDto, @Req() req: any) {
    return this.rrhhService.actualizarTrabajador(id, dto, req.user.idUsuario);
  }

  @Patch('personal/:id/estado')
  setEstadoTrabajador(@Param('id') id: string, @Body() dto: SetTrabajadorEstadoDto, @Req() req: any) {
    return this.rrhhService.setEstadoTrabajador(id, dto.estado, req.user.idUsuario);
  }

  @Post('pagos')
  crearPago(@Body() dto: CreatePagoPersonalDto, @Req() req: any) {
    return this.rrhhService.crearPago(dto, req.user.idUsuario);
  }

  @Get('pagos')
  listarPagos(@Query() query: ListarPagosDto) {
    return this.rrhhService.listarPagos(query);
  }

  @Patch('pagos/:id')
  actualizarPago(@Param('id') id: string, @Body() dto: UpdatePagoPersonalDto, @Req() req: any) {
    return this.rrhhService.actualizarPago(id, dto, req.user.idUsuario);
  }

  @Delete('pagos/:id')
  anularPago(@Param('id') id: string, @Body() dto: AnularPagoPersonalDto, @Req() req: any) {
    return this.rrhhService.anularPago(id, req.user.idUsuario, dto?.motivo);
  }
}
