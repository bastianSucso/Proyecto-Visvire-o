import { Body, Controller, Get, Post, UseGuards, Req } from '@nestjs/common';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDEDOR')
@Controller('api/caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Post('abrir')
  abrir(@Req() req: any, @Body() dto: AbrirCajaDto) {
    return this.cajaService.abrirCaja(req.user.id, dto);
  }

  @Get('actual')
  actual(@Req() req: any) {
    return this.cajaService.cajaActual(req.user.id);
  }
}
