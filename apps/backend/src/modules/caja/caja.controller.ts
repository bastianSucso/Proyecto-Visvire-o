// apps/backend/src/modules/caja/caja.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateCajaDto } from './dto/create-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';


@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}


  @Roles('VENDEDOR')
  @Post('abrir')
  abrir(@Req() req: any, @Body() dto: AbrirCajaDto) {
    return this.cajaService.abrirCaja(req.user.idUsuario, dto);
  }

  @Roles('VENDEDOR')
  @Get('actual')
  actual(@Req() req: any) {
    return this.cajaService.cajaActual(req.user.idUsuario);
  }

  @Roles('VENDEDOR')
  @Get('fisicas')
  listarCajasFisicasVendedor(@Query('soloActivas') soloActivas?: string) {
    const onlyActive = soloActivas === 'true' || soloActivas === '1';
    return this.cajaService.listarCajasFisicas({ onlyActive });
  }

 
  @Roles('ADMIN')
  @Post('admin')
  crearCajaFisica(@Body() dto: CreateCajaDto) {
    return this.cajaService.crearCajaFisica(dto);
  }

  @Roles('ADMIN')
  @Get('admin')
  listarCajasFisicasAdmin(@Query('onlyActive') onlyActive?: string) {
    const active = onlyActive === 'true' || onlyActive === '1';
    return this.cajaService.listarCajasFisicas({ onlyActive: active });
  }

  @Roles('ADMIN')
  @Patch('admin/:idCaja')
  actualizarCajaFisica(
    @Param('idCaja', ParseIntPipe) idCaja: number,
    @Body() dto: UpdateCajaDto,
  ) {
    return this.cajaService.actualizarCajaFisica(idCaja, dto);
  }
}
