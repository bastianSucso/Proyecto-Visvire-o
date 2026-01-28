import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { CreateIncidenciaStockDto } from './dto/create-incidencia-stock.dto';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(SesionCajaEntity)
    private readonly sesionRepo: Repository<SesionCajaEntity>,

    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,

    @InjectRepository(IncidenciaStockEntity)
    private readonly incidenciaRepo: Repository<IncidenciaStockEntity>,
  ) {}

  async crearIncidencia(dto: CreateIncidenciaStockDto, usuarioId: string) {
    const sesionId = (dto as any).sesionCajaId ?? (dto as any).historialId;
    if (!sesionId) throw new BadRequestException('Falta sesionCajaId (o historialId)');

    const sesionCaja = await this.sesionRepo.findOne({
      where: { id: sesionId },
    });
    if (!sesionCaja) throw new BadRequestException('Sesión de caja no existe');

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new BadRequestException('Producto no existe');

    const inc = this.incidenciaRepo.create({
      sesionCaja, 
      producto,
      usuario: { idUsuario: usuarioId } as any,
      tipo: dto.tipo,
      cantidad: dto.cantidad,
      observacion: dto.observacion ?? null,
    });

    return this.incidenciaRepo.save(inc);
  }

  async listarIncidenciasPorUsuario(userId: string) {

    return this.incidenciaRepo.find({
      where: [
        { sesionCaja: { usuario: { idUsuario: userId } } },
      ],
      relations: {
        producto: true,
        sesionCaja: true,
      },
      order: {
        fecha: 'DESC',
      },
    });
  }

  async listarIncidenciasTurnoActual(userId: string) {
    // ✅ buscamos la sesión ABIERTA más reciente donde el usuario abrió
    const sesionActiva = await this.sesionRepo.findOne({
      where: {
        usuario: { idUsuario: userId },
        fechaCierre: IsNull(),
      },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesionActiva) return [];

    return this.incidenciaRepo.find({
      where: {
        sesionCaja: { id: sesionActiva.id },
      },
      relations: { producto: true, sesionCaja: true },
      order: { fecha: 'DESC' },
    });
  }
}
