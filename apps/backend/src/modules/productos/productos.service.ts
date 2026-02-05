import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { ProductoEntity, ProductoTipoEnum } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { ProductoStockEntity } from './entities/producto-stock.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { RecetasService } from './recetas.service';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly repo: Repository<ProductoEntity>,
    @InjectRepository(ProductoStockEntity)
    private readonly stockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,
    private readonly recetasService: RecetasService,
  ) {}

  private assertTipoValid(tipo?: ProductoTipoEnum) {
    if (!tipo) {
      throw new BadRequestException('Debe seleccionar un tipo de producto');
    }
  }

  // Derivados según MER (no persistidos)
  private toResponse(
    p: ProductoEntity,
    extra?: { cantidadTotal?: number; stockSalaVenta?: number },
  ) {
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
      rendimiento: p.rendimiento ?? null,
      isActive: p.isActive,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      tipo: p.tipo,
      ...(stockSalaVenta !== undefined ? { stockSalaVenta } : {}),
      cantidadTotal,
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
    return stocks.reduce((sum, s) => sum + Number(s.cantidad ?? 0), 0);
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const items = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
      relations: { stocks: true },
    });

    return items.map((p) => {
      const cantidadTotal = (p.stocks ?? []).reduce((sum, s) => sum + Number(s.cantidad ?? 0), 0);
      return this.toResponse(p, { cantidadTotal });
    });
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({
      where: { id },
      relations: { stocks: true },
    });
    if (!p) throw new NotFoundException('Producto no encontrado');
    const cantidadTotal = (p.stocks ?? []).reduce((sum, s) => sum + Number(s.cantidad ?? 0), 0);
    return this.toResponse(p, { cantidadTotal });
  }

  async findByBarcode(barcode: string) {
    const cleaned = barcode.trim();
    if (!cleaned) throw new BadRequestException('barcode es requerido');

    const p = await this.repo.findOne({
      where: { barcode: cleaned },
      relations: { stocks: true },
    });
    if (!p) throw new NotFoundException('Producto no encontrado por barcode');

    const cantidadTotal = (p.stocks ?? []).reduce((sum, s) => sum + Number(s.cantidad ?? 0), 0);
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
    this.assertTipoValid(dto.tipo);
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

    const isComida = dto.tipo === ProductoTipoEnum.COMIDA;
    const isInsumo = dto.tipo === ProductoTipoEnum.INSUMO;
    const entity = this.repo.create({
      name: dto.name.trim(),
      internalCode,
      barcode,
      unidadBase: dto.unidadBase?.trim() || null,
      precioCosto: isComida ? '0.00' : dto.precioCosto.toFixed(2),
      precioVenta: isInsumo ? '0.00' : dto.precioVenta.toFixed(2),
      rendimiento: dto.rendimiento !== undefined ? dto.rendimiento.toFixed(3) : null,
      isActive: true,
      tipo: dto.tipo!,
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
          cantidad: '0.000',
        }),
      );
      await this.stockRepo.save(stocks);
    }

    const cantidadTotal = await this.getCantidadTotalByProductoId(saved.id);
    const full = await this.repo.findOne({
      where: { id: saved.id },
    });
    return this.toResponse(full ?? saved, { cantidadTotal });
  }

  async update(id: string, dto: UpdateProductoDto) {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Producto no encontrado');

    const prevPrecioCosto = Number(existing.precioCosto ?? 0);
    const tipoActual = existing.tipo;
    const tipoFinal = dto.tipo ?? tipoActual;
    const isComida = tipoFinal === ProductoTipoEnum.COMIDA;
    const isInsumo = tipoFinal === ProductoTipoEnum.INSUMO;

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

    if (!isComida && dto.precioCosto !== undefined) {
      existing.precioCosto = dto.precioCosto.toFixed(2);
    }
    if (!isInsumo && dto.precioVenta !== undefined) {
      existing.precioVenta = dto.precioVenta.toFixed(2);
    }
    if (isInsumo) existing.precioVenta = '0.00';
    if (dto.rendimiento !== undefined) {
      existing.rendimiento = dto.rendimiento === null ? null : dto.rendimiento.toFixed(3);
    }
    if (dto.tipo !== undefined) {
      this.assertTipoValid(dto.tipo);
      existing.tipo = dto.tipo;
      if (dto.tipo === ProductoTipoEnum.COMIDA) {
        existing.precioCosto = '0.00';
      }
      if (dto.tipo === ProductoTipoEnum.INSUMO) {
        existing.precioVenta = '0.00';
      }
    }
    if (dto.isActive !== undefined) existing.isActive = dto.isActive;

    const saved = await this.repo.save(existing);
    const precioCostoChanged =
      !isComida && dto.precioCosto !== undefined && Number(dto.precioCosto ?? 0) !== prevPrecioCosto;
    if (precioCostoChanged) {
      if (saved.tipo === ProductoTipoEnum.INSUMO) {
        await this.recetasService.recalculateCostosByInsumo(saved.id);
      }
    }
    const cantidadTotal = await this.getCantidadTotalByProductoId(saved.id);
    const full = await this.repo.findOne({
      where: { id: saved.id },
    });
    return this.toResponse(full ?? saved, { cantidadTotal });
  }

  async setActive(id: string, isActive: boolean) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    p.isActive = isActive;
    const saved = await this.repo.save(p);
    const cantidadTotal = await this.getCantidadTotalByProductoId(saved.id);
    return this.toResponse(saved, { cantidadTotal });
  }

  private async getProductoOrThrow(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
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
