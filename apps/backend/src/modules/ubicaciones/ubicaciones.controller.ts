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
import { UbicacionesService } from './ubicaciones.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { CreateUbicacionDto } from './dto/create-ubicacion.dto';
import { UpdateUbicacionDto } from './dto/update-ubicacion.dto';
import type { UbicacionTipo } from './entities/ubicacion.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/ubicaciones')
export class UbicacionesController {
  constructor(private readonly service: UbicacionesService) {}

  @Get()
  @Roles('ADMIN')
  list(@Query('tipo') tipo?: UbicacionTipo, @Query('includeInactive') include?: string) {
    const includeInactive = include !== 'false';
    return this.service.list(tipo, includeInactive);
  }

  @Post()
  @Roles('ADMIN')
  create(@Body() dto: CreateUbicacionDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(@Param('id') id: string, @Body() dto: UpdateUbicacionDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
