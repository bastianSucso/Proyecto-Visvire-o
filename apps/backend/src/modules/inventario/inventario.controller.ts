import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { CreateAjusteDto } from './dto/create-ajuste.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { CreateDocumentoIngresoDto } from './dto/create-documento-ingreso.dto';
import { CreateDocumentoTraspasoDto } from './dto/create-documento-traspaso.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Roles('ADMIN')
  @Post('ingresos')
  registrarIngreso(@Body() dto: CreateIngresoDto, @Req() req: any) {
    return this.inventarioService.registrarIngreso(dto, req.user.idUsuario);
  }

  @Roles('ADMIN')
  @Post('ajustes')
  registrarAjuste(@Body() dto: CreateAjusteDto, @Req() req: any) {
    return this.inventarioService.registrarAjuste(dto, req.user.idUsuario);
  }

  @Roles('ADMIN')
  @Post('traspasos')
  registrarTraspaso(@Body() dto: CreateTraspasoDto, @Req() req: any) {
    return this.inventarioService.registrarTraspaso(dto, req.user.idUsuario);
  }

  // Documentos (ingreso / traspaso)
  @Roles('ADMIN')
  @Post('documentos/ingreso')
  crearDocumentoIngreso(@Body() dto: CreateDocumentoIngresoDto, @Req() req: any) {
    return this.inventarioService.crearDocumentoIngreso(dto, req.user.idUsuario);
  }

  @Roles('ADMIN')
  @Post('documentos/traspaso')
  crearDocumentoTraspaso(@Body() dto: CreateDocumentoTraspasoDto, @Req() req: any) {
    return this.inventarioService.crearDocumentoTraspaso(dto, req.user.idUsuario);
  }

  @Roles('ADMIN')
  @Get('documentos/:documentoRef')
  obtenerDocumento(@Param('documentoRef') documentoRef: string) {
    return this.inventarioService.obtenerDocumento(documentoRef);
  }

  @Roles('ADMIN')
  @Get('stock')
  consultarStock(@Query('search') search?: string) {
    return this.inventarioService.consultarStock(search);
  }

  @Roles('ADMIN')
  @Get('movimientos')
  listarMovimientos(@Query('limit') limit?: string) {
    return this.inventarioService.listarMovimientos(limit ? Number(limit) : 200);
  }

  @Roles('ADMIN')
  @Get('documentos')
  listarDocumentos(@Query('limit') limit?: string) {
    return this.inventarioService.listarDocumentos(limit ? Number(limit) : 200);
  }
}
