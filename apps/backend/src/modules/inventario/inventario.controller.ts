import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { CreateAjusteDto } from './dto/create-ajuste.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { CreateAjusteOperativoDto } from './dto/create-ajuste-operativo.dto';
import { CreateDocumentoIngresoDto } from './dto/create-documento-ingreso.dto';
import { CreateDocumentoTraspasoDto } from './dto/create-documento-traspaso.dto';
import { ConvertirProductoDto } from './dto/convertir-producto.dto';
import { CreateConversionFactorDto } from './dto/create-conversion-factor.dto';
import { CreateInventarioSalaObjetivoDto } from './dto/create-inventario-sala-objetivo.dto';
import { UpdateInventarioSalaObjetivoDto } from './dto/update-inventario-sala-objetivo.dto';
import { AddInventarioHojaCompraItemDto } from './dto/add-inventario-hoja-compra-item.dto';
import { UpdateInventarioHojaCompraItemDto } from './dto/update-inventario-hoja-compra-item.dto';
import { CreateInventarioProductoImportanteDto } from './dto/create-inventario-producto-importante.dto';
import { UpdateInventarioProductoImportanteDto } from './dto/update-inventario-producto-importante.dto';

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
  @Get('ajustes-operativos/causas')
  listarCausasAjusteOperativo() {
    return this.inventarioService.listarCausasAjusteOperativo();
  }

  @Roles('ADMIN')
  @Post('ajustes-operativos')
  registrarAjusteOperativo(@Body() dto: CreateAjusteOperativoDto, @Req() req: any) {
    return this.inventarioService.registrarAjusteOperativo(dto, req.user.idUsuario);
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
  @Get('sala-objetivos')
  listarSalaObjetivos() {
    return this.inventarioService.listarSalaObjetivos();
  }

  @Roles('ADMIN')
  @Post('sala-objetivos')
  crearSalaObjetivo(@Body() dto: CreateInventarioSalaObjetivoDto) {
    return this.inventarioService.crearSalaObjetivo(dto);
  }

  @Roles('ADMIN')
  @Patch('sala-objetivos/:id')
  actualizarSalaObjetivo(@Param('id') id: string, @Body() dto: UpdateInventarioSalaObjetivoDto) {
    return this.inventarioService.actualizarSalaObjetivo(id, dto);
  }

  @Roles('ADMIN')
  @Delete('sala-objetivos/:id')
  eliminarSalaObjetivo(@Param('id') id: string) {
    return this.inventarioService.eliminarSalaObjetivo(id);
  }

  @Roles('ADMIN')
  @Get('hoja-compra')
  listarHojaCompra() {
    return this.inventarioService.listarHojaCompra();
  }

  @Roles('ADMIN')
  @Post('hoja-compra')
  agregarHojaCompraItem(@Body() dto: AddInventarioHojaCompraItemDto) {
    return this.inventarioService.agregarHojaCompraItem(dto);
  }

  @Roles('ADMIN')
  @Patch('hoja-compra/:id')
  actualizarHojaCompraItem(@Param('id') id: string, @Body() dto: UpdateInventarioHojaCompraItemDto) {
    return this.inventarioService.actualizarHojaCompraItem(id, dto);
  }

  @Roles('ADMIN')
  @Delete('hoja-compra/:id')
  eliminarHojaCompraItem(@Param('id') id: string) {
    return this.inventarioService.eliminarHojaCompraItem(id);
  }

  @Roles('ADMIN')
  @Post('hoja-compra/limpiar')
  limpiarHojaCompra() {
    return this.inventarioService.limpiarHojaCompra();
  }

  @Roles('ADMIN')
  @Get('hoja-compra/productos-importantes')
  listarProductosImportantes() {
    return this.inventarioService.listarProductosImportantes();
  }

  @Roles('ADMIN')
  @Post('hoja-compra/productos-importantes')
  crearProductoImportante(@Body() dto: CreateInventarioProductoImportanteDto) {
    return this.inventarioService.crearProductoImportante(dto);
  }

  @Roles('ADMIN')
  @Patch('hoja-compra/productos-importantes/:id')
  actualizarProductoImportante(
    @Param('id') id: string,
    @Body() dto: UpdateInventarioProductoImportanteDto,
  ) {
    return this.inventarioService.actualizarProductoImportante(id, dto);
  }

  @Roles('ADMIN')
  @Delete('hoja-compra/productos-importantes/:id')
  eliminarProductoImportante(@Param('id') id: string) {
    return this.inventarioService.eliminarProductoImportante(id);
  }

  @Roles('ADMIN')
  @Post('convertir-producto')
  convertirProducto(@Body() dto: ConvertirProductoDto, @Req() req: any) {
    return this.inventarioService.convertirProducto(dto, req.user.idUsuario);
  }

  @Roles('ADMIN')
  @Get('conversiones')
  obtenerConversion(@Query('origenId') origenId?: string, @Query('destinoId') destinoId?: string) {
    return this.inventarioService.obtenerConversion(origenId, destinoId);
  }

  @Roles('ADMIN')
  @Post('conversiones')
  guardarConversion(@Body() dto: CreateConversionFactorDto) {
    return this.inventarioService.guardarConversion(dto);
  }

  @Roles('ADMIN')
  @Get('movimientos')
  listarMovimientos(@Query('limit') limit?: string) {
    return this.inventarioService.listarMovimientos(limit ? Number(limit) : 200);
  }

  @Roles('ADMIN')
  @Get('movimientos/detalle/:tipo/:ref')
  obtenerMovimientoDetalle(@Param('tipo') tipo: string, @Param('ref') ref: string) {
    return this.inventarioService.obtenerMovimientoDetalle(tipo as any, ref);
  }

  @Roles('ADMIN')
  @Get('documentos')
  listarDocumentos(@Query('limit') limit?: string) {
    return this.inventarioService.listarDocumentos(limit ? Number(limit) : 200);
  }
}
