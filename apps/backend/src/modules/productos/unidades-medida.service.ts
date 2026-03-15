import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UnidadMedidaEntity } from './entities/unidad-medida.entity';
import { ProductoEntity } from './entities/producto.entity';
import { CreateUnidadMedidaDto } from './dto/create-unidad-medida.dto';
import { UpdateUnidadMedidaDto } from './dto/update-unidad-medida.dto';

@Injectable()
export class UnidadesMedidaService {
  constructor(
    @InjectRepository(UnidadMedidaEntity)
    private readonly unidadesRepo: Repository<UnidadMedidaEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productosRepo: Repository<ProductoEntity>,
  ) {}

  private normalizeNombre(nombre: string) {
    return nombre.trim().toLowerCase();
  }

  private async getReferenceCountMap() {
    const rows = await this.productosRepo
      .createQueryBuilder('p')
      .select('p.unidadBase', 'unidadBase')
      .addSelect('COUNT(*)', 'count')
      .where('p.unidadBase IS NOT NULL')
      .groupBy('p.unidadBase')
      .getRawMany<{ unidadBase: string | null; count: string }>();

    return new Map(rows.map((row) => [row.unidadBase ?? '', Number(row.count ?? 0)]));
  }

  private toResponse(unidad: UnidadMedidaEntity, referencedCount: number) {
    return {
      id: unidad.id,
      nombre: unidad.nombre,
      isActive: unidad.isActive,
      createdAt: unidad.createdAt,
      updatedAt: unidad.updatedAt,
      referencedCount,
      canDelete: referencedCount === 0,
    };
  }

  async list(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    const [unidades, countMap] = await Promise.all([
      this.unidadesRepo.find({ where, order: { nombre: 'ASC' } }),
      this.getReferenceCountMap(),
    ]);

    return unidades.map((it) => this.toResponse(it, countMap.get(it.nombre) ?? 0));
  }

  async create(dto: CreateUnidadMedidaDto) {
    const nombre = dto.nombre.trim();
    const nombreNormalizado = this.normalizeNombre(nombre);

    if (!nombreNormalizado) {
      throw new BadRequestException('nombre es requerido');
    }

    const dup = await this.unidadesRepo.findOne({ where: { nombreNormalizado } });
    if (dup) {
      throw new ConflictException('Ya existe una unidad con ese nombre');
    }

    const created = await this.unidadesRepo.save(
      this.unidadesRepo.create({
        nombre,
        nombreNormalizado,
        isActive: true,
      }),
    );
    return this.toResponse(created, 0);
  }

  async updateNombre(id: string, dto: UpdateUnidadMedidaDto) {
    const unidad = await this.unidadesRepo.findOne({ where: { id } });
    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada');
    }

    const nombre = dto.nombre.trim();
    const nombreNormalizado = this.normalizeNombre(nombre);
    if (!nombreNormalizado) {
      throw new BadRequestException('nombre es requerido');
    }

    const dup = await this.unidadesRepo.findOne({ where: { nombreNormalizado, id: Not(id) } });
    if (dup) {
      throw new ConflictException('Ya existe una unidad con ese nombre');
    }

    const prevNombre = unidad.nombre;
    unidad.nombre = nombre;
    unidad.nombreNormalizado = nombreNormalizado;
    const saved = await this.unidadesRepo.save(unidad);

    if (prevNombre !== nombre) {
      await this.productosRepo
        .createQueryBuilder()
        .update(ProductoEntity)
        .set({ unidadBase: nombre })
        .where('unidadBase = :prevNombre', { prevNombre })
        .execute();
    }

    const refCount = await this.productosRepo.count({ where: { unidadBase: nombre } });
    return this.toResponse(saved, refCount);
  }

  async setActive(id: string, isActive: boolean) {
    const unidad = await this.unidadesRepo.findOne({ where: { id } });
    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada');
    }

    unidad.isActive = isActive;
    const saved = await this.unidadesRepo.save(unidad);
    const refCount = await this.productosRepo.count({ where: { unidadBase: saved.nombre } });
    return this.toResponse(saved, refCount);
  }

  async remove(id: string) {
    const unidad = await this.unidadesRepo.findOne({ where: { id } });
    if (!unidad) {
      throw new NotFoundException('Unidad no encontrada');
    }

    const referencedCount = await this.productosRepo.count({ where: { unidadBase: unidad.nombre } });
    if (referencedCount > 0) {
      throw new BadRequestException('No se puede eliminar una unidad referenciada por productos');
    }

    await this.unidadesRepo.remove(unidad);
    return { ok: true };
  }

  async assertUnidadActivaExists(nombre: string) {
    const normalized = this.normalizeNombre(nombre);
    const unidad = await this.unidadesRepo.findOne({ where: { nombreNormalizado: normalized } });
    if (!unidad) {
      throw new BadRequestException('La unidad seleccionada no existe');
    }
    if (!unidad.isActive) {
      throw new BadRequestException('La unidad seleccionada está inactiva');
    }
    return unidad;
  }
}
