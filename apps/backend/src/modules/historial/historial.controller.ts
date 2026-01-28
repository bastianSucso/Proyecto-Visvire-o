import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HistorialService } from './historial.service';
import { CreateIncidenciaStockDto } from './dto/create-incidencia-stock.dto';
import { Request } from 'express';

@Controller('api/sesion-caja')
export class SesionCajaController {
  constructor(private readonly historialService: HistorialService) {}

  @Post('incidencias')
  crearIncidencia(@Body() dto: CreateIncidenciaStockDto, @Req() req: any) {
    return this.historialService.crearIncidencia(dto, req.user.idUsuario);
  }

  @Get('incidencias/mias')
  listarMisIncidencias(@Req() req: any) {
    return this.historialService.listarIncidenciasPorUsuario(req.user.idUsuario);
  }

  @Get('incidencias/mias/turno')
  listarMisIncidenciasTurno(@Req() req: any) {
    return this.historialService.listarIncidenciasTurnoActual(req.user.idUsuario);
  }
}
