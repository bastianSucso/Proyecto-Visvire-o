import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { VentasService } from './ventas.service';
import { AddItemVentaDto } from './dto/add-item-venta.dto';
import { UpdateItemVentaDto } from './dto/update-item-venta.dto';
import { ConfirmarVentaDto } from './dto/confirmar-venta.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('VENDEDOR')
@Controller('api/ventas')
export class VentasController {
  constructor(private readonly service: VentasService) {}

  @Post()
  crear(@Req() req: any) {
    return this.service.crearVenta(req.user.id);
  }

  @Get(':idVenta')
  obtener(@Req() req: any, @Param('idVenta') idVenta: string) {
    return this.service.obtenerVenta(req.user.id, Number(idVenta));
  }

  @Delete(':idVenta')
  eliminarVenta(@Req() req: any, @Param('idVenta') idVenta: string) {
    return this.service.eliminarVenta(req.user.id, Number(idVenta));
  }

  @Post(':idVenta/items')
  agregarItem(@Req() req: any, @Param('idVenta') idVenta: string, @Body() dto: AddItemVentaDto) {
    return this.service.agregarItem(req.user.id, Number(idVenta), dto);
  }

  @Patch(':idVenta/items/:idItem')
  actualizarItem(
    @Req() req: any,
    @Param('idVenta') idVenta: string,
    @Param('idItem') idItem: string,
    @Body() dto: UpdateItemVentaDto,
  ) {
    return this.service.actualizarItem(req.user.id, Number(idVenta), Number(idItem), dto);
  }

  @Patch(':idVenta/confirmar')
  confirmar(@Req() req: any, @Param('idVenta') idVenta: string, @Body() dto: ConfirmarVentaDto,) {
    return this.service.confirmarVenta(req.user.id, Number(idVenta), dto);
  }

  // HU-CJ-04: Eliminar item
  @Delete(':idVenta/items/:idItem')
  eliminarItem(@Req() req: any, @Param('idVenta') idVenta: string, @Param('idItem') idItem: string) {
    return this.service.eliminarItem(req.user.id, Number(idVenta), Number(idItem));
  }
    
  @Get()
  list(@Req() req: any, @Query('sesionCajaId') sesionCajaId?: string) {
    return this.service.listarVentas(req.user.id, sesionCajaId ? Number(sesionCajaId) : undefined);
  }

}
