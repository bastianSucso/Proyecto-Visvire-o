import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AlojamientoService } from './alojamiento.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CreatePisoZonaDto } from './dto/create-piso-zona.dto';
import { UpdatePisoZonaDto } from './dto/update-piso-zona.dto';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';
import { CreateComodidadDto } from './dto/create-comodidad.dto';
import { UpdateComodidadDto } from './dto/update-comodidad.dto';
import { CreateEmpresaHostalDto } from './dto/create-empresa-hostal.dto';
import { CreateHuespedDto } from './dto/create-huesped.dto';
import { CreateAsignacionHabitacionDto } from './dto/create-asignacion-habitacion.dto';
import { UpdateHuespedDto } from './dto/update-huesped.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/alojamiento')
export class AlojamientoController {
  constructor(private readonly service: AlojamientoService) {}

  // Pisos / zonas
  @Get('floors')
  @Roles('ADMIN', 'VENDEDOR')
  listPisos() {
    return this.service.listPisos();
  }

  @Post('floors')
  @Roles('ADMIN')
  createPiso(@Body() dto: CreatePisoZonaDto) {
    return this.service.createPiso(dto);
  }

  @Patch('floors/:id')
  @Roles('ADMIN')
  updatePiso(@Param('id') id: string, @Body() dto: UpdatePisoZonaDto) {
    return this.service.updatePiso(id, dto);
  }

  @Delete('floors/:id')
  @Roles('ADMIN')
  removePiso(@Param('id') id: string) {
    return this.service.removePiso(id);
  }

  // Habitaciones
  @Get('floors/:id/rooms')
  @Roles('ADMIN', 'VENDEDOR')
  listRooms(@Param('id') pisoId: string) {
    return this.service.listHabitacionesByPiso(pisoId);
  }

  @Post('floors/:id/rooms')
  @Roles('ADMIN')
  createRoom(@Param('id') pisoId: string, @Body() dto: CreateHabitacionDto) {
    return this.service.createHabitacion(pisoId, dto);
  }

  @Patch('rooms/:id')
  @Roles('ADMIN')
  updateRoom(@Param('id') id: string, @Body() dto: UpdateHabitacionDto) {
    return this.service.updateHabitacion(id, dto);
  }

  @Delete('rooms/:id')
  @Roles('ADMIN')
  removeRoom(@Param('id') id: string) {
    return this.service.removeHabitacion(id);
  }

  @Post('rooms/bulk-delete')
  @Roles('ADMIN')
  bulkRemove(@Body() body: { ids: string[] }) {
    return this.service.bulkRemoveHabitaciones(body.ids ?? []);
  }

  @Get('rooms/available')
  @Roles('ADMIN', 'VENDEDOR')
  listDisponibles(@Query('from') from?: string, @Query('to') to?: string) {
    return this.service.listHabitacionesDisponibles(from, to);
  }

  @Get('rooms/:id/current-assignment')
  @Roles('ADMIN', 'VENDEDOR')
  getCurrentAssignment(@Param('id') habitacionId: string) {
    return this.service.getAsignacionActualByHabitacion(habitacionId);
  }

  // Empresas
  @Get('companies')
  @Roles('ADMIN', 'VENDEDOR')
  listEmpresas() {
    return this.service.listEmpresasHostal();
  }

  @Post('companies')
  @Roles('ADMIN', 'VENDEDOR')
  createEmpresa(@Body() dto: CreateEmpresaHostalDto) {
    return this.service.createEmpresaHostal(dto);
  }

  // Huéspedes
  @Get('guests')
  @Roles('ADMIN', 'VENDEDOR')
  listHuespedes(@Query('search') search?: string) {
    if (search) {
      return this.service.searchHuespedes(search);
    }
    return this.service.listHuespedes();
  }

  @Post('guests')
  @Roles('ADMIN', 'VENDEDOR')
  createHuesped(@Body() dto: CreateHuespedDto) {
    return this.service.createHuesped(dto);
  }

  @Patch('guests/:id')
  @Roles('ADMIN', 'VENDEDOR')
  updateHuesped(@Param('id') id: string, @Body() dto: UpdateHuespedDto) {
    return this.service.updateHuesped(id, dto);
  }

  // Asignaciones
  @Post('assignments')
  @Roles('ADMIN', 'VENDEDOR')
  createAsignacion(@Body() dto: CreateAsignacionHabitacionDto, @Req() req: any) {
    return this.service.createAsignacion(dto, req.user.idUsuario);
  }

  // Comodidades
  @Get('amenities')
  @Roles('ADMIN')
  listComodidades(@Query('includeInactive') include?: string) {
    const includeInactive = include !== 'false';
    return this.service.listComodidades(includeInactive);
  }

  @Post('amenities')
  @Roles('ADMIN')
  createComodidad(@Body() dto: CreateComodidadDto) {
    return this.service.createComodidad(dto);
  }

  @Patch('amenities/:id')
  @Roles('ADMIN')
  updateComodidad(@Param('id') id: string, @Body() dto: UpdateComodidadDto) {
    return this.service.updateComodidad(id, dto);
  }

  @Delete('amenities/:id')
  @Roles('ADMIN')
  removeComodidad(@Param('id') id: string) {
    return this.service.removeComodidad(id);
  }

}
