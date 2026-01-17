import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { HistorialEntity } from './entities/historial.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { CreateIncidenciaStockDto } from './dto/create-incidencia-stock.dto';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(HistorialEntity)
    private readonly historialRepo: Repository<HistorialEntity>,

    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,

    @InjectRepository(IncidenciaStockEntity)
    private readonly incidenciaRepo: Repository<IncidenciaStockEntity>
  ) {}

  async crearIncidencia(dto: CreateIncidenciaStockDto, usuarioId: string) {
    const historial = await this.historialRepo.findOne({ where: { idHistorial: dto.historialId } });
    if (!historial) throw new BadRequestException('Historial no existe');

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new BadRequestException('Producto no existe');

    const inc = this.incidenciaRepo.create({
      historial,
      producto,
      usuario: { id: usuarioId } as any,
      tipo: dto.tipo,
      cantidad: dto.cantidad,
      observacion: dto.observacion ?? null,
    });

    return this.incidenciaRepo.save(inc);
  }
  

  async listarIncidenciasPorUsuario(userId: string) {
    return this.incidenciaRepo.find({
      where: {
        historial: {
          usuario: { id: userId },
        },
      },
      relations: {
        producto: true,
        historial: true,
      },
      order: {
        fecha: 'DESC',
      },
    });
  }

  async listarIncidenciasTurnoActual(userId: string) {
    const historialActivo = await this.historialRepo.findOne({
      where: {
        usuario: { id: userId },
        fechaCierre: IsNull(), 
      },
      order: { fechaApertura: 'DESC' },
    });

    if (!historialActivo) return []; 

    return this.incidenciaRepo.find({
      where: {
        historial: { idHistorial: historialActivo.idHistorial },
      },
      relations: { producto: true, historial: true },
      order: { fecha: 'DESC' },
    });
  }


}
