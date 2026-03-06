import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { DashboardService } from './dashboard.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/dashboard/admin')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('operativo-hoy')
  operativoHoy(@Query('dias') diasRaw?: string) {
    const dias = Number(diasRaw);
    const diasSerie = dias === 30 ? 30 : 7;
    return this.service.getOperativoHoy(diasSerie);
  }
}
