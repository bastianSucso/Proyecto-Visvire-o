import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UbicacionEntity, UbicacionTipo } from './entities/ubicacion.entity';
import { CreateUbicacionDto } from './dto/create-ubicacion.dto';
import { UpdateUbicacionDto } from './dto/update-ubicacion.dto';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { StockSesionCajaEntity } from '../historial/entities/stock-sesion-caja.entity';
import { IncidenciaStockEntity } from '../historial/entities/incidencia-stock.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { AlteraEntity } from '../inventario/entities/altera.entity';

@Injectable()
export class UbicacionesService implements OnModuleInit {
  constructor(
    @InjectRepository(UbicacionEntity)
    private readonly repo: Repository<UbicacionEntity>,
    @InjectRepository(ProductoStockEntity)
    private readonly stockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(StockSesionCajaEntity)
    private readonly stockSesionRepo: Repository<StockSesionCajaEntity>,
    @InjectRepository(IncidenciaStockEntity)
    private readonly incidenciaRepo: Repository<IncidenciaStockEntity>,
    @InjectRepository(AlteraEntity)
    private readonly alteraRepo: Repository<AlteraEntity>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  private async ensureDefaults() {
    const sala = await this.repo.findOne({
      where: { tipo: 'SALA_VENTA' },
      order: { createdAt: 'ASC' },
    });

    if (!sala) {
      const created = await this.repo.save(
        this.repo.create({ nombre: 'Sala-Venta-1', tipo: 'SALA_VENTA', activa: true }),
      );
      await this.createStocksForUbicacion(created);
    }

    const bodega = await this.repo.findOne({
      where: { tipo: 'BODEGA' },
      order: { createdAt: 'ASC' },
    });

    if (!bodega) {
      const created = await this.repo.save(
        this.repo.create({ nombre: 'Bodega-1', tipo: 'BODEGA', activa: true }),
      );
      await this.createStocksForUbicacion(created);
    }
  }

  private async createStocksForUbicacion(ubicacion: UbicacionEntity) {
    const productos = await this.productoRepo.find({ select: ['id'] });
    if (productos.length === 0) return;

    const stocks = productos.map((p) =>
      this.stockRepo.create({
        producto: { id: p.id } as any,
        ubicacion: { id: ubicacion.id } as any,
        cantidad: '0.000',
      }),
    );

    await this.stockRepo.save(stocks);
  }

  async list(tipo?: UbicacionTipo, includeInactive = true) {
    const where: any = {};
    if (tipo) where.tipo = tipo;
    if (!includeInactive) where.activa = true;

    return this.repo.find({
      where,
      order: { createdAt: 'ASC' },
    });
  }

  async create(dto: CreateUbicacionDto) {
    const nombre = dto.nombre.trim();
    if (!nombre) throw new BadRequestException('nombre es requerido');

    const dup = await this.repo.findOne({
      where: { nombre, tipo: dto.tipo } as any,
    });
    if (dup) throw new ConflictException('Ya existe una ubicación con ese nombre y tipo');

    const entity = this.repo.create({ nombre, tipo: dto.tipo, activa: true });
    const saved = await this.repo.save(entity);
    await this.createStocksForUbicacion(saved);
    return saved;
  }

  async update(id: string, dto: UpdateUbicacionDto) {
    const ubicacion = await this.repo.findOne({ where: { id } });
    if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) throw new BadRequestException('nombre es requerido');

      const dup = await this.repo.findOne({
        where: { nombre, tipo: ubicacion.tipo } as any,
      });
      if (dup && dup.id !== ubicacion.id) {
        throw new ConflictException('Ya existe una ubicación con ese nombre y tipo');
      }
      ubicacion.nombre = nombre;
    }

    if (dto.activa !== undefined) {
      ubicacion.activa = dto.activa;
    }

    return this.repo.save(ubicacion);
  }

  private async hasReferences(id: string): Promise<boolean> {
    const [sesionCount, incidenciaCount, alteraCount, origenCount, destinoCount] = await Promise.all([
      this.stockSesionRepo.count({ where: { ubicacion: { id } } as any }),
      this.incidenciaRepo.count({ where: { ubicacion: { id } } as any }),
      this.alteraRepo.count({ where: { ubicacion: { id } } as any }),
      this.alteraRepo.count({ where: { origen: { id } } as any }),
      this.alteraRepo.count({ where: { destino: { id } } as any }),
    ]);

    return (
      sesionCount > 0 ||
      incidenciaCount > 0 ||
      alteraCount > 0 ||
      origenCount > 0 ||
      destinoCount > 0
    );
  }

  async remove(id: string) {
    const ubicacion = await this.repo.findOne({ where: { id } });
    if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');

    const hasRefs = await this.hasReferences(id);
    if (hasRefs) {
      throw new ConflictException(
        'No se puede eliminar: la ubicación tiene referencias. Desactívala en su lugar.',
      );
    }

    await this.repo.remove(ubicacion);
    return { ok: true };
  }
}
