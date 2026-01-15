import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { HistorialEntity } from './entities/historial.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { CreateIncidenciaStockDto } from './dto/create-incidencia-stock.dto';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(IncidenciaStockEntity)
    private readonly incRepo: Repository<IncidenciaStockEntity>,

    @InjectRepository(HistorialEntity)
    private readonly historialRepo: Repository<HistorialEntity>,

    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
  ) {}

  async crearIncidencia(dto: CreateIncidenciaStockDto, usuarioId: string) {
    const historial = await this.historialRepo.findOne({ where: { idHistorial: dto.historialId } });
    if (!historial) throw new BadRequestException('Historial no existe');

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new BadRequestException('Producto no existe');

    const inc = this.incRepo.create({
      historial,
      producto,
      usuario: { id: usuarioId } as any,
      tipo: dto.tipo,
      cantidad: dto.cantidad,
      observacion: dto.observacion ?? null,
    });

    return this.incRepo.save(inc);
  }
}
