import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InconsistenciaCategoriaEntity } from './entities/inconsistencia-categoria.entity';
import { CreateInconsistenciaCategoriaDto } from './dto/create-inconsistencia-categoria.dto';
import { UpdateInconsistenciaCategoriaDto } from './dto/update-inconsistencia-categoria.dto';
import { IncidenciaStockEntity } from './entities/incidencia-stock.entity';
import { IncidenciaResolucionAdminEntity } from './entities/incidencia-resolucion-admin.entity';

@Injectable()
export class InconsistenciasCategoriasService {
  constructor(
    @InjectRepository(InconsistenciaCategoriaEntity)
    private readonly categoriaRepo: Repository<InconsistenciaCategoriaEntity>,
    @InjectRepository(IncidenciaStockEntity)
    private readonly incidenciaRepo: Repository<IncidenciaStockEntity>,
    @InjectRepository(IncidenciaResolucionAdminEntity)
    private readonly resolucionRepo: Repository<IncidenciaResolucionAdminEntity>,
  ) {}

  private normalizeCode(value: string): string {
    const ascii = (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 30);

    if (!ascii) {
      throw new BadRequestException('No se pudo generar un código válido para la categoría');
    }

    return ascii;
  }

  async list(includeInactive = true) {
    const where = includeInactive ? {} : ({ activa: true } as any);

    return this.categoriaRepo.find({
      where,
      order: { orden: 'ASC', createdAt: 'ASC' },
    });
  }

  async listActivas() {
    return this.list(false);
  }

  async findActiveOrThrow(id: string) {
    const categoria = await this.categoriaRepo.findOne({ where: { id, activa: true } });
    if (!categoria) {
      throw new BadRequestException('Categoría de inconsistencia no existe o está inactiva');
    }
    return categoria;
  }

  async create(dto: CreateInconsistenciaCategoriaDto) {
    const nombre = dto.nombre?.trim();
    if (!nombre) throw new BadRequestException('nombre es requerido');

    const codigo = this.normalizeCode(nombre);
    const dup = await this.categoriaRepo.findOne({ where: { codigo } });
    if (dup) throw new ConflictException(`Ya existe una categoría con código "${codigo}"`);

    return this.categoriaRepo.save(
      this.categoriaRepo.create({
        codigo,
        nombre,
        descripcion: dto.descripcion?.trim() || null,
        activa: dto.activa ?? true,
        esSistema: false,
        orden: dto.orden ?? 0,
      }),
    );
  }

  async update(id: string, dto: UpdateInconsistenciaCategoriaDto) {
    const categoria = await this.categoriaRepo.findOne({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) throw new BadRequestException('nombre es requerido');
      categoria.nombre = nombre;
    }

    if (dto.descripcion !== undefined) {
      categoria.descripcion = dto.descripcion.trim() || null;
    }

    if (dto.orden !== undefined) categoria.orden = dto.orden;
    if (dto.activa !== undefined) categoria.activa = dto.activa;

    return this.categoriaRepo.save(categoria);
  }

  async remove(id: string) {
    const categoria = await this.categoriaRepo.findOne({ where: { id } });
    if (!categoria) throw new NotFoundException('Categoría no encontrada');

    const [incidencias, resoluciones] = await Promise.all([
      this.incidenciaRepo.count({ where: { categoria: { id } } as any }),
      this.resolucionRepo.count({ where: { categoria: { id } } as any }),
    ]);

    if (incidencias > 0 || resoluciones > 0) {
      throw new ConflictException(
        'No se puede eliminar: la categoría tiene referencias. Desactívala en su lugar.',
      );
    }

    await this.categoriaRepo.remove(categoria);
    return { ok: true };
  }
}
