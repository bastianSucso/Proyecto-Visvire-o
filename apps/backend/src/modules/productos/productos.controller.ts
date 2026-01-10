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
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('api/productos')
export class ProductosController {
  constructor(private readonly service: ProductosService) {}

  // GET /api/productos?includeInactive=true
  @Get()
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.service.findAll(includeInactive === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateProductoDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductoDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/active')
  setActive(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.service.setActive(id, body.isActive);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
