import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull } from 'typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    @InjectRepository(ProductoEntity)
    private readonly repo: Repository<ProductoEntity>,
  ) {}

  // Derivados según MER (no persistidos)
  private toResponse(p: ProductoEntity) {
    const costo = Number(p.precioCosto);
    const venta = Number(p.precioVenta);

    return {
      ...p,
      cantidadTotal: p.stockBodega + p.stockSalaVenta,
      gananciaProducto: Number((venta - costo).toFixed(2)),
    };
  }

  async findAll(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const items = await this.repo.find({
      where,
      order: { createdAt: 'DESC' },
    });
    return items.map((p) => this.toResponse(p));
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return this.toResponse(p);
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
      stockBodega: dto.stockBodega ?? 0,
      stockSalaVenta: dto.stockSalaVenta ?? 0,
      precioCosto: dto.precioCosto.toFixed(2),
      precioVenta: dto.precioVenta.toFixed(2),
      isActive: true,
    });

    const saved = await this.repo.save(entity);
    return this.toResponse(saved);
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
    return this.toResponse(saved);
  }

  async setActive(id: string, isActive: boolean) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    p.isActive = isActive;
    const saved = await this.repo.save(p);
    return this.toResponse(saved);
  }

  async remove(id: string) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    await this.repo.remove(p);
    return { ok: true };
  }
}
