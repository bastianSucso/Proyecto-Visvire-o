import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { HistorialService } from './historial.service';
import { CreateIncidenciaStockDto } from './dto/create-incidencia-stock.dto';
import { Request } from 'express';

@Controller('historial')
@UseGuards(JwtAuthGuard)
export class HistorialController {
  constructor(private readonly historialService: HistorialService) {}

  @Post('incidencias')
  crearIncidencia(@Body() dto: CreateIncidenciaStockDto, @Req() req: any) {
    return this.historialService.crearIncidencia(dto, req.user.id);
  }
}
