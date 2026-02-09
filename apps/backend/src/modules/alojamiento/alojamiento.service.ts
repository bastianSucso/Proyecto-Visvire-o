import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { PisoZonaEntity } from './entities/piso-zona.entity';
import { HabitacionEntity } from './entities/habitacion.entity';
import { ComodidadEntity } from './entities/comodidad.entity';
import { CamaEntity } from './entities/cama.entity';
import { InventarioHabitacionEntity } from './entities/inventario-habitacion.entity';
import { CreatePisoZonaDto } from './dto/create-piso-zona.dto';
import { UpdatePisoZonaDto } from './dto/update-piso-zona.dto';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';
import { CreateComodidadDto } from './dto/create-comodidad.dto';
import { UpdateComodidadDto } from './dto/update-comodidad.dto';

type Rect = { posX: number; posY: number; ancho: number; alto: number };

@Injectable()
export class AlojamientoService {
  constructor(
    @InjectRepository(PisoZonaEntity)
    private readonly pisoRepo: Repository<PisoZonaEntity>,
    @InjectRepository(HabitacionEntity)
    private readonly habitacionRepo: Repository<HabitacionEntity>,
    @InjectRepository(ComodidadEntity)
    private readonly comodidadRepo: Repository<ComodidadEntity>,
    @InjectRepository(CamaEntity)
    private readonly camaRepo: Repository<CamaEntity>,
    @InjectRepository(InventarioHabitacionEntity)
    private readonly inventarioRepo: Repository<InventarioHabitacionEntity>,
  ) {}

  // -------- Pisos / Zonas --------
  async listPisos() {
    return this.pisoRepo.find({ order: { orden: 'ASC', createdAt: 'ASC' } });
  }

  async createPiso(dto: CreatePisoZonaDto) {
    const nombre = dto.nombre.trim();
    if (!nombre) throw new BadRequestException('nombre es requerido');

    const entity = this.pisoRepo.create({
      nombre,
      orden: dto.orden ?? 1,
      anchoLienzo: dto.anchoLienzo ?? 1400,
      altoLienzo: dto.altoLienzo ?? 900,
      tamanoCuadricula: dto.tamanoCuadricula ?? 5,
      snapActivo: dto.snapActivo ?? true,
    });

    return this.pisoRepo.save(entity);
  }

  async updatePiso(id: string, dto: UpdatePisoZonaDto) {
    const piso = await this.pisoRepo.findOne({ where: { id } });
    if (!piso) throw new NotFoundException('Piso/zona no encontrado');

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) throw new BadRequestException('nombre es requerido');
      piso.nombre = nombre;
    }
    if (dto.orden !== undefined) piso.orden = dto.orden;
    if (dto.anchoLienzo !== undefined) piso.anchoLienzo = dto.anchoLienzo;
    if (dto.altoLienzo !== undefined) piso.altoLienzo = dto.altoLienzo;
    if (dto.tamanoCuadricula !== undefined) piso.tamanoCuadricula = dto.tamanoCuadricula;
    if (dto.snapActivo !== undefined) piso.snapActivo = dto.snapActivo;

    return this.pisoRepo.save(piso);
  }

  async removePiso(id: string) {
    const piso = await this.pisoRepo.findOne({ where: { id } });
    if (!piso) throw new NotFoundException('Piso/zona no encontrado');
    await this.pisoRepo.remove(piso);
    return { ok: true };
  }

  // -------- Habitaciones --------
  async listHabitacionesByPiso(pisoId: string) {
    const piso = await this.pisoRepo.findOne({ where: { id: pisoId } });
    if (!piso) throw new NotFoundException('Piso/zona no encontrado');

    return this.habitacionRepo.find({
      where: { pisoZona: { id: pisoId } } as any,
      relations: {
        pisoZona: true,
        comodidades: true,
        camas: true,
        inventarios: true,
      },
      order: { createdAt: 'ASC' },
    });
  }

  private intersects(a: Rect, b: Rect) {
    return a.posX < b.posX + b.ancho &&
      a.posX + a.ancho > b.posX &&
      a.posY < b.posY + b.alto &&
      a.posY + a.alto > b.posY;
  }

  private async hasCollision(pisoId: string, rect: Rect, excludeId?: string) {
    const where: any = { pisoZona: { id: pisoId } };
    if (excludeId) where.id = Not(excludeId);
    const rooms = await this.habitacionRepo.find({ where } as any);

    return rooms.some((r) => this.intersects(rect, r));
  }

  private async applyComodidades(room: HabitacionEntity, ids?: string[]) {
    if (!ids) return;

    if (ids.length === 0) {
      room.comodidades = [];
      return;
    }

    const comodidades = await this.comodidadRepo.find({ where: { id: In(ids) } });
    if (comodidades.length !== ids.length) {
      throw new BadRequestException('Comodidades inválidas');
    }
    room.comodidades = comodidades;
  }

  private async applyCamas(room: HabitacionEntity, camas?: { item: string; cantidad: number }[]) {
    if (!camas) return;
    await this.camaRepo.delete({ habitacion: { id: room.id } } as any);
    if (camas.length === 0) return;

    const entities = camas.map((c) =>
      this.camaRepo.create({
        item: c.item.trim(),
        cantidad: c.cantidad,
        habitacion: { id: room.id } as any,
      }),
    );

    await this.camaRepo.save(entities);
  }

  private async applyInventario(
    room: HabitacionEntity,
    inventario?: { item: string; cantidad: number; observacion?: string }[],
  ) {
    if (!inventario) return;

    await this.inventarioRepo.delete({ habitacion: { id: room.id } } as any);
    if (inventario.length === 0) return;

    const items = inventario.map((i) =>
      this.inventarioRepo.create({
        item: i.item.trim(),
        cantidad: i.cantidad,
        observacion: i.observacion?.trim() || null,
        habitacion: { id: room.id } as any,
      }),
    );
    await this.inventarioRepo.save(items);
  }

  async createHabitacion(pisoId: string, dto: CreateHabitacionDto) {
    const piso = await this.pisoRepo.findOne({ where: { id: pisoId } });
    if (!piso) throw new NotFoundException('Piso/zona no encontrado');

    const identificador = dto.identificador.trim();
    if (!identificador) throw new BadRequestException('identificador es requerido');

    const dup = await this.habitacionRepo.findOne({ where: { identificador, pisoZona: { id: pisoId } } as any });
    if (dup) throw new ConflictException('Ya existe una habitación con ese identificador');

    const rect = { posX: dto.posX, posY: dto.posY, ancho: dto.ancho, alto: dto.alto };
    if (!dto.allowOverlap) {
      const hasCollision = await this.hasCollision(pisoId, rect);
      if (hasCollision) throw new ConflictException('La habitación se superpone con otra habitación');
    }

    const room = this.habitacionRepo.create({
      identificador,
      precio: dto.precio.toFixed(2),
      estadoActivo: dto.estadoActivo ?? true,
      posX: dto.posX,
      posY: dto.posY,
      ancho: dto.ancho,
      alto: dto.alto,
      pisoZona: { id: pisoId } as any,
    });

    const saved = await this.habitacionRepo.save(room);
    await this.applyComodidades(saved, dto.comodidades);
    await this.habitacionRepo.save(saved);
    await this.applyCamas(saved, dto.camas);
    await this.applyInventario(saved, dto.inventario);

    return this.habitacionRepo.findOne({
      where: { id: saved.id },
      relations: { comodidades: true, camas: true, inventarios: true, pisoZona: true },
    });
  }

  async updateHabitacion(id: string, dto: UpdateHabitacionDto) {
    const room = await this.habitacionRepo.findOne({
      where: { id },
      relations: { comodidades: true, pisoZona: true },
    });
    if (!room) throw new NotFoundException('Habitación no encontrada');
    const pisoId = room.pisoZona?.id;
    if (!pisoId) throw new BadRequestException('Piso/zona inválido');

    if (dto.identificador !== undefined) {
      const identificador = dto.identificador.trim();
      if (!identificador) throw new BadRequestException('identificador es requerido');
      if (identificador !== room.identificador) {
        const dup = await this.habitacionRepo.findOne({
          where: { identificador, id: Not(id), pisoZona: { id: pisoId } } as any,
        });
        if (dup) throw new ConflictException('Ya existe una habitación con ese identificador');
      }
      room.identificador = identificador;
    }

    if (dto.precio !== undefined) room.precio = dto.precio.toFixed(2);
    if (dto.estadoActivo !== undefined) room.estadoActivo = dto.estadoActivo;
    if (dto.posX !== undefined) room.posX = dto.posX;
    if (dto.posY !== undefined) room.posY = dto.posY;
    if (dto.ancho !== undefined) room.ancho = dto.ancho;
    if (dto.alto !== undefined) room.alto = dto.alto;

    const rect = { posX: room.posX, posY: room.posY, ancho: room.ancho, alto: room.alto };
    if (!dto.allowOverlap) {
      const hasCollision = await this.hasCollision(pisoId, rect, room.id);
      if (hasCollision) throw new ConflictException('La habitación se superpone con otra habitación');
    }

    await this.habitacionRepo.save(room);
    await this.applyComodidades(room, dto.comodidades);
    await this.habitacionRepo.save(room);
    await this.applyCamas(room, dto.camas);
    await this.applyInventario(room, dto.inventario);

    return this.habitacionRepo.findOne({
      where: { id: room.id },
      relations: { comodidades: true, camas: true, inventarios: true, pisoZona: true },
    });
  }

  async removeHabitacion(id: string) {
    const room = await this.habitacionRepo.findOne({ where: { id } });
    if (!room) throw new NotFoundException('Habitación no encontrada');
    await this.habitacionRepo.remove(room);
    return { ok: true };
  }

  async bulkRemoveHabitaciones(ids: string[]) {
    if (!ids || ids.length === 0) return { ok: true };
    await this.habitacionRepo.delete({ id: In(ids) });
    return { ok: true };
  }

  // -------- Comodidades --------
  async listComodidades(includeInactive = true) {
    const where = includeInactive ? {} : { activa: true };
    return this.comodidadRepo.find({ where, order: { nombre: 'ASC' } });
  }

  async createComodidad(dto: CreateComodidadDto) {
    const nombre = dto.nombre.trim();
    if (!nombre) throw new BadRequestException('nombre es requerido');
    const dup = await this.comodidadRepo.findOne({ where: { nombre } });
    if (dup) throw new ConflictException('Ya existe una comodidad con ese nombre');

    const entity = this.comodidadRepo.create({
      nombre,
      descripcion: dto.descripcion?.trim() || null,
      activa: dto.activa ?? true,
    });
    return this.comodidadRepo.save(entity);
  }

  async updateComodidad(id: string, dto: UpdateComodidadDto) {
    const item = await this.comodidadRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Comodidad no encontrada');

    if (dto.nombre !== undefined) {
      const nombre = dto.nombre.trim();
      if (!nombre) throw new BadRequestException('nombre es requerido');
      if (nombre !== item.nombre) {
        const dup = await this.comodidadRepo.findOne({ where: { nombre } });
        if (dup) throw new ConflictException('Ya existe una comodidad con ese nombre');
      }
      item.nombre = nombre;
    }

    if (dto.descripcion !== undefined) item.descripcion = dto.descripcion?.trim() || null;
    if (dto.activa !== undefined) item.activa = dto.activa;
    return this.comodidadRepo.save(item);
  }

  private async hasHabitacionesByComodidad(id: string) {
    const count = await this.habitacionRepo
      .createQueryBuilder('h')
      .leftJoin('h.comodidades', 'c')
      .where('c.id = :id', { id })
      .getCount();
    return count > 0;
  }

  async removeComodidad(id: string) {
    const item = await this.comodidadRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Comodidad no encontrada');
    const hasRefs = await this.hasHabitacionesByComodidad(id);
    if (hasRefs) {
      throw new ConflictException('No se puede eliminar: la comodidad tiene habitaciones asociadas');
    }
    await this.comodidadRepo.remove(item);
    return { ok: true };
  }

}
