import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
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

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/alojamiento')
export class AlojamientoController {
  constructor(private readonly service: AlojamientoService) {}

  // Pisos / zonas
  @Get('floors')
  @Roles('ADMIN')
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
  @Roles('ADMIN')
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
