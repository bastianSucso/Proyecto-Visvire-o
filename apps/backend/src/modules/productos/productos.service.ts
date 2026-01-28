import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductoStockEntity } from './entities/producto-stock.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly repo: Repository<ProductoEntity>,
    @InjectRepository(ProductoStockEntity)
    private readonly stockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,
  ) {}

  // Derivados según MER (no persistidos)
  private toResponse(
    p: ProductoEntity,
    extra?: { cantidadTotal?: number; stockSalaVenta?: number },
  ) {
    const costo = Number(p.precioCosto);
    const venta = Number(p.precioVenta);
    const cantidadTotal = extra?.cantidadTotal ?? 0;
    const stockSalaVenta = extra?.stockSalaVenta;

    return {
      id: p.id,
      name: p.name,
      internalCode: p.internalCode,
      barcode: p.barcode,
      unidadBase: p.unidadBase,
      precioCosto: p.precioCosto,
      precioVenta: p.precioVenta,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      ...(stockSalaVenta !== undefined ? { stockSalaVenta } : {}),
      cantidadTotal,
      gananciaProducto: Number((venta - costo).toFixed(2)),
    };
  }

  private async getSalaVentaActivaOrThrow(): Promise<UbicacionEntity> {
    const sala = await this.ubicacionRepo.findOne({
      where: { tipo: 'SALA_VENTA', activa: true } as any,
      order: { createdAt: 'ASC' },
    });
    if (!sala) throw new NotFoundException('No existe sala de ventas activa.');
    return sala;
  }

  private async getCantidadTotalByProductoId(id: string): Promise<number> {
    const stocks = await this.stockRepo.find({
      where: { producto: { id } } as any,
    });
    return stocks.reduce((sum, s) => sum + (s.cantidad ?? 0), 0);
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const items = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { stocks: true },
    });

    return items.map((p) => {
      const cantidadTotal = (p.stocks ?? []).reduce((sum, s) => sum + (s.cantidad ?? 0), 0);
      return this.toResponse(p, { cantidadTotal });
    });
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({
      where: { id },
      relations: { stocks: true },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    const cantidadTotal = (p.stocks ?? []).reduce((sum, s) => sum + (s.cantidad ?? 0), 0);
    return this.toResponse(p, { cantidadTotal });
  }

  async findSala() {
    const sala = await this.getSalaVentaActivaOrThrow();

    const qb = this.repo
      .createQueryBuilder('p')
      .leftJoin('p.stocks', 'ps', 'ps.id_ubicacion = :idUb', { idUb: sala.id })
      .addSelect('COALESCE(ps.cantidad, 0)', 'stockSalaVenta')
      .where('p.isActive = :active', { active: true })
      .orderBy('p.name', 'ASC');

    const { entities, raw } = await qb.getRawAndEntities();

    return entities.map((p, i) =>
      this.toResponse(p, { stockSalaVenta: Number(raw[i]?.stockSalaVenta ?? 0) }),
    );
  }

  async create(dto: CreateProductoDto) {
    const internalCode = dto.internalCode.trim();
    const barcode = dto.barcode?.trim() || null;

    const dupInternal = await this.repo.findOne({ where: { internalCode } });
    if (dupInternal) {
      throw new ConflictException('Ya existe un producto con ese código interno');
    }

    if (barcode) {
      const dupBarcode = await this.repo.findOne({ where: { barcode } });
      if (dupBarcode) {
        throw new ConflictException('Ya existe un producto con ese código de barra');
      }
    }

    const entity = this.repo.create({
      name: dto.name.trim(),
      internalCode,
      barcode,
      unidadBase: dto.unidadBase?.trim() || null,
      precioCosto: dto.precioCosto.toFixed(2),
      precioVenta: dto.precioVenta.toFixed(2),
      isActive: true,
    });

    const saved = await this.repo.save(entity);

    const ubicaciones = await this.ubicacionRepo.find({
      where: { activa: true } as any,
      order: { createdAt: 'ASC' },
    });

    if (ubicaciones.length > 0) {
      const stocks = ubicaciones.map((u) =>
        this.stockRepo.create({
          producto: saved,
          ubicacion: u,
          cantidad: 0,
        }),
      );
      await this.stockRepo.save(stocks);
    }

    const cantidadTotal = await this.getCantidadTotalByProductoId(saved.id);
    return this.toResponse(saved, { cantidadTotal });
  }

  async update(id: string, dto: UpdateProductoDto) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    // internalCode (unique)
    if (dto.internalCode !== undefined) {
      const newInternal = dto.internalCode.trim();
      if (newInternal !== existing.internalCode) {
        const dup = await this.repo.findOne({ where: { internalCode: newInternal } });
        if (dup) throw new ConflictException('Ya existe un producto con ese código interno');
        existing.internalCode = newInternal;
      }
    }

    // barcode (unique if not null)
    if (dto.barcode !== undefined) {
      const newBarcode = dto.barcode?.trim() || null;

      if (newBarcode === null) {
        existing.barcode = null;
      } else {
        if (newBarcode !== existing.barcode) {
          const dup = await this.repo.findOne({ where: { barcode: newBarcode, id: Not(id) } });
          if (dup) throw new ConflictException('Ya existe un producto con ese código de barra');
          existing.barcode = newBarcode;
        }
      }
    }

    if (dto.name !== undefined) existing.name = dto.name.trim();
    if (dto.unidadBase !== undefined) existing.unidadBase = dto.unidadBase?.trim() || null;

    if (dto.precioCosto !== undefined) existing.precioCosto = dto.precioCosto.toFixed(2);
    if (dto.precioVenta !== undefined) existing.precioVenta = dto.precioVenta.toFixed(2);

    if (dto.isActive !== undefined) existing.isActive = dto.isActive;

    const saved = await this.repo.save(existing);
    const cantidadTotal = await this.getCantidadTotalByProductoId(saved.id);
    return this.toResponse(saved, { cantidadTotal });
  }

  async setActive(id: string, isActive: boolean) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    p.isActive = isActive;
    const saved = await this.repo.save(p);
    const cantidadTotal = await this.getCantidadTotalByProductoId(saved.id);
    return this.toResponse(saved, { cantidadTotal });
  }

  async remove(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    await this.repo.remove(p);
    return { ok: true };
  }

  async suggestInternalCode() {
    const row = await this.repo
      .createQueryBuilder('p')
      .select("MAX(CAST(p.internalCode AS INT))", 'max')
      .where("p.internalCode ~ '^[0-9]+$'")
      .getRawOne<{ max: string | null }>();

    const nextNumber = Number(row?.max ?? 0) + 1;

    const formatted = nextNumber
      .toString()
      .padStart(6, '0'); // ← 6 dígitos

    return { internalCode: formatted };
  }



}
