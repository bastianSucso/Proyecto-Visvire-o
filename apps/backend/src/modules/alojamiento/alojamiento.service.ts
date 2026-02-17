import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Not, Repository } from 'typeorm';
import { PisoZonaEntity } from './entities/piso-zona.entity';
import { HabitacionEntity } from './entities/habitacion.entity';
import { ComodidadEntity } from './entities/comodidad.entity';
import { CamaEntity } from './entities/cama.entity';
import { InventarioHabitacionEntity } from './entities/inventario-habitacion.entity';
import { EmpresaHostalEntity } from './entities/empresa-hostal.entity';
import { HuespedEntity } from './entities/huesped.entity';
import {
  AsignacionEstado,
  AsignacionHabitacionEntity,
  AsignacionTipoCobro,
} from './entities/asignacion-habitacion.entity';
import { SesionCajaEntity } from '../historial/entities/sesion-caja.entity';
import {
  VentaAlojamientoEntity,
  VentaAlojamientoEstado,
} from './entities/venta-alojamiento.entity';
import { CreatePisoZonaDto } from './dto/create-piso-zona.dto';
import { UpdatePisoZonaDto } from './dto/update-piso-zona.dto';
import { CreateHabitacionDto } from './dto/create-habitacion.dto';
import { UpdateHabitacionDto } from './dto/update-habitacion.dto';
import { CreateComodidadDto } from './dto/create-comodidad.dto';
import { UpdateComodidadDto } from './dto/update-comodidad.dto';
import { CreateEmpresaHostalDto } from './dto/create-empresa-hostal.dto';
import { UpdateEmpresaHostalDto } from './dto/update-empresa-hostal.dto';
import { CreateHuespedDto } from './dto/create-huesped.dto';
import { CreateAsignacionHabitacionDto } from './dto/create-asignacion-habitacion.dto';
import { UpdateHuespedDto } from './dto/update-huesped.dto';
import { MedioPago } from '../ventas/entities/venta.entity';

type Rect = { posX: number; posY: number; ancho: number; alto: number };

@Injectable()
export class AlojamientoService {
  private readonly businessTimeZone = 'America/Santiago';
  private readonly nightStartHour = 20;
  private readonly nightEndHour = 5;
  private readonly checkoutHour = 12;
  private readonly businessDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: this.businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  private readonly businessOffsetFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: this.businessTimeZone,
    timeZoneName: 'shortOffset',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  constructor(
    private readonly dataSource: DataSource,
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
    @InjectRepository(EmpresaHostalEntity)
    private readonly empresaHostalRepo: Repository<EmpresaHostalEntity>,
    @InjectRepository(HuespedEntity)
    private readonly huespedRepo: Repository<HuespedEntity>,
    @InjectRepository(AsignacionHabitacionEntity)
    private readonly asignacionRepo: Repository<AsignacionHabitacionEntity>,
    @InjectRepository(SesionCajaEntity)
    private readonly sesionRepo: Repository<SesionCajaEntity>,
    @InjectRepository(VentaAlojamientoEntity)
    private readonly ventaAlojamientoRepo: Repository<VentaAlojamientoEntity>,
  ) {}

  // -------- Empresas --------
  async listEmpresasHostal() {
    return this.empresaHostalRepo.find({ order: { nombreEmpresa: 'ASC', createdAt: 'ASC' } });
  }

  async createEmpresaHostal(dto: CreateEmpresaHostalDto) {
    const rutEmpresa = dto.rutEmpresa.trim();
    const nombreEmpresa = dto.nombreEmpresa.trim();
    if (!rutEmpresa) throw new BadRequestException('rutEmpresa es requerido');
    if (!nombreEmpresa) throw new BadRequestException('nombreEmpresa es requerido');

    const entity = this.empresaHostalRepo.create({
      rutEmpresa,
      nombreEmpresa,
      nombreContratista: dto.nombreContratista?.trim() || null,
      correoContratista: dto.correoContratista?.trim() || null,
      fonoContratista: dto.fonoContratista?.trim() || null,
    });

    try {
      return await this.empresaHostalRepo.save(entity);
    } catch (err: any) {
      if (err?.code === '23505') throw new ConflictException('El rutEmpresa ya existe');
      throw err;
    }
  }

  async updateEmpresaHostal(id: string, dto: UpdateEmpresaHostalDto) {
    const empresa = await this.empresaHostalRepo.findOne({ where: { id } });
    if (!empresa) throw new NotFoundException('Empresa hostal no encontrada');

    if (dto.rutEmpresa !== undefined) {
      const rutEmpresa = dto.rutEmpresa.trim();
      if (!rutEmpresa) throw new BadRequestException('rutEmpresa es requerido');
      empresa.rutEmpresa = rutEmpresa;
    }

    if (dto.nombreEmpresa !== undefined) {
      const nombreEmpresa = dto.nombreEmpresa.trim();
      if (!nombreEmpresa) throw new BadRequestException('nombreEmpresa es requerido');
      empresa.nombreEmpresa = nombreEmpresa;
    }

    if (dto.nombreContratista !== undefined) empresa.nombreContratista = dto.nombreContratista?.trim() || null;
    if (dto.correoContratista !== undefined) empresa.correoContratista = dto.correoContratista?.trim() || null;
    if (dto.fonoContratista !== undefined) empresa.fonoContratista = dto.fonoContratista?.trim() || null;

    try {
      return await this.empresaHostalRepo.save(empresa);
    } catch (err: any) {
      if (err?.code === '23505') throw new ConflictException('El rutEmpresa ya existe');
      throw err;
    }
  }

  async removeEmpresaHostal(id: string) {
    const empresa = await this.empresaHostalRepo.findOne({ where: { id } });
    if (!empresa) throw new NotFoundException('Empresa hostal no encontrada');
    await this.empresaHostalRepo.remove(empresa);
    return { ok: true as const };
  }

  // -------- Huespedes --------
  async listHuespedes() {
    return this.huespedRepo.find({
      relations: { empresaHostal: true },
      order: { createdAt: 'DESC' },
    });
  }

  async createHuesped(dto: CreateHuespedDto) {
    const nombreCompleto = dto.nombreCompleto.trim();
    if (!nombreCompleto) throw new BadRequestException('nombreCompleto es requerido');

    let empresaHostal: EmpresaHostalEntity | null = null;
    if (dto.empresaHostalId) {
      empresaHostal = await this.empresaHostalRepo.findOne({ where: { id: dto.empresaHostalId } });
      if (!empresaHostal) throw new NotFoundException('Empresa hostal no encontrada');
    }

    const entity = this.huespedRepo.create({
      nombreCompleto,
      correo: dto.correo?.trim() || null,
      rut: dto.rut?.trim() || null,
      observacion: dto.observacion?.trim() || null,
      telefono: dto.telefono?.trim() || null,
      empresaHostal,
    });

    try {
      return await this.huespedRepo.save(entity);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('El RUT ya existe');
      }
      throw err;
    }
  }

  async searchHuespedes(search: string) {
    const term = search.trim();
    if (!term) return [];
    const like = `%${term.toLowerCase()}%`;

    return this.huespedRepo
      .createQueryBuilder('h')
      .leftJoinAndSelect('h.empresaHostal', 'e')
      .where('LOWER(h.nombreCompleto) LIKE :term', { term: like })
      .orWhere('LOWER(h.rut) LIKE :term', { term: like })
      .orWhere('LOWER(h.correo) LIKE :term', { term: like })
      .orWhere('LOWER(h.telefono) LIKE :term', { term: like })
      .orWhere('LOWER(e.nombreEmpresa) LIKE :term', { term: like })
      .orderBy('h.createdAt', 'DESC')
      .limit(20)
      .getMany();
  }

  async updateHuesped(id: string, dto: UpdateHuespedDto) {
    const huesped = await this.huespedRepo.findOne({ where: { id }, relations: { empresaHostal: true } });
    if (!huesped) throw new NotFoundException('Huésped no encontrado');

    if (dto.nombreCompleto !== undefined) {
      const nombreCompleto = dto.nombreCompleto.trim();
      if (!nombreCompleto) throw new BadRequestException('nombreCompleto es requerido');
      huesped.nombreCompleto = nombreCompleto;
    }

    if (dto.correo !== undefined) huesped.correo = dto.correo?.trim() || null;
    if (dto.observacion !== undefined) huesped.observacion = dto.observacion?.trim() || null;
    if (dto.telefono !== undefined) huesped.telefono = dto.telefono?.trim() || null;

    if (dto.rut !== undefined) {
      const rut = dto.rut?.trim() || null;
      if (huesped.rut && rut && huesped.rut !== rut) {
        throw new BadRequestException('El RUT no puede ser modificado');
      }
      if (!huesped.rut) {
        huesped.rut = rut;
      }
    }

    if (dto.empresaHostalId !== undefined) {
      if (!dto.empresaHostalId) {
        huesped.empresaHostal = null;
      } else {
        const empresa = await this.empresaHostalRepo.findOne({ where: { id: dto.empresaHostalId } });
        if (!empresa) throw new NotFoundException('Empresa hostal no encontrada');
        huesped.empresaHostal = empresa;
      }
    }

    try {
      return await this.huespedRepo.save(huesped);
    } catch (err: any) {
      if (err?.code === '23505') {
        throw new ConflictException('El RUT ya existe');
      }
      throw err;
    }
  }

  private parseTimestamp(value?: string) {
    if (!value) throw new BadRequestException('Fechas requeridas');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException('Fecha inválida');
    return date;
  }

  private calculateFechaSalidaEstimada(fechaIngreso: Date, cantidadNoches: number) {
    const ingreso = this.getBusinessDateParts(fechaIngreso);
    const cuentaNocheAnterior = this.isHourInsideNightWindow(ingreso.hour) && ingreso.hour < this.nightEndHour;

    const fechaBase = this.shiftCalendarDate(
      ingreso.year,
      ingreso.month,
      ingreso.day,
      cuentaNocheAnterior ? -1 : 0,
    );
    const fechaCheckout = this.shiftCalendarDate(
      fechaBase.year,
      fechaBase.month,
      fechaBase.day,
      cantidadNoches,
    );

    return this.createBusinessDate(
      fechaCheckout.year,
      fechaCheckout.month,
      fechaCheckout.day,
      this.checkoutHour,
      0,
      0,
    );
  }

  private isHourInsideNightWindow(hour: number) {
    return hour >= this.nightStartHour || hour < this.nightEndHour;
  }

  private getBusinessDateParts(date: Date) {
    const parts = this.businessDateTimeFormatter.formatToParts(date);
    const get = (type: Intl.DateTimeFormatPartTypes) => {
      const value = parts.find((part) => part.type === type)?.value;
      if (!value) {
        throw new BadRequestException('No se pudieron interpretar las fechas de alojamiento');
      }
      return Number(value);
    };

    return {
      year: get('year'),
      month: get('month'),
      day: get('day'),
      hour: get('hour'),
      minute: get('minute'),
      second: get('second'),
    };
  }

  private shiftCalendarDate(year: number, month: number, day: number, deltaDays: number) {
    const utc = new Date(Date.UTC(year, month - 1, day));
    utc.setUTCDate(utc.getUTCDate() + deltaDays);
    return {
      year: utc.getUTCFullYear(),
      month: utc.getUTCMonth() + 1,
      day: utc.getUTCDate(),
    };
  }

  private createBusinessDate(
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
  ) {
    const utcBase = Date.UTC(year, month - 1, day, hour, minute, second, 0);
    const firstGuess = new Date(utcBase);
    const offsetMinutes = this.getOffsetMinutesAt(firstGuess);
    const firstResult = new Date(utcBase - offsetMinutes * 60_000);

    const confirmedOffset = this.getOffsetMinutesAt(firstResult);
    if (confirmedOffset === offsetMinutes) {
      return firstResult;
    }

    return new Date(utcBase - confirmedOffset * 60_000);
  }

  private getOffsetMinutesAt(date: Date) {
    const part = this.businessOffsetFormatter
      .formatToParts(date)
      .find((item) => item.type === 'timeZoneName')?.value;

    if (!part) {
      throw new BadRequestException('No se pudo resolver zona horaria de negocio');
    }

    if (part === 'GMT' || part === 'UTC') {
      return 0;
    }

    const match = part.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) {
      throw new BadRequestException('Formato de zona horaria no soportado');
    }

    const sign = match[1] === '-' ? -1 : 1;
    const hours = Number(match[2]);
    const minutes = Number(match[3] ?? '0');
    return sign * (hours * 60 + minutes);
  }

  private parseCantidadNoches(value: number) {
    const noches = Number(value);
    if (!Number.isInteger(noches) || noches < 1) {
      throw new BadRequestException('cantidadNoches debe ser un entero mayor o igual a 1');
    }
    return noches;
  }

  private async getSesionAbiertaOrFail(userId: string) {
    const sesion = await this.sesionRepo.findOne({
      where: { usuario: { idUsuario: userId }, fechaCierre: IsNull() },
      relations: { usuario: true, caja: true },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesion) throw new ConflictException('No hay caja abierta (sesión abierta).');
    return sesion;
  }

  async listHabitacionesDisponibles(from?: string, to?: string) {
    let fechaIngreso: Date;
    let fechaSalidaEstimada: Date;

    if (!from && !to) {
      fechaIngreso = new Date();
      fechaSalidaEstimada = new Date(fechaIngreso.getTime() + 60 * 1000);
    } else {
      if (!from || !to) {
        throw new BadRequestException('Debes indicar ambas fechas o ninguna');
      }

      fechaIngreso = this.parseTimestamp(from);
      fechaSalidaEstimada = this.parseTimestamp(to);
      if (fechaSalidaEstimada <= fechaIngreso) {
        throw new BadRequestException('La fecha de salida debe ser posterior a la fecha de ingreso');
      }
    }

    return this.habitacionRepo
      .createQueryBuilder('h')
      .leftJoin(
        'h.asignaciones',
        'a',
        'a.fechaIngreso < :fechaSalida AND COALESCE(a.fechaSalidaReal, a.fechaSalidaEstimada) > :fechaIngreso',
        { fechaIngreso, fechaSalida: fechaSalidaEstimada },
      )
      .leftJoinAndSelect('h.pisoZona', 'p')
      .leftJoinAndSelect('h.comodidades', 'c')
      .leftJoinAndSelect('h.camas', 'ca')
      .where('h.estadoActivo = :activo', { activo: true })
      .andWhere('a.id IS NULL')
      .orderBy('h.createdAt', 'ASC')
      .getMany();
  }

  async createAsignacion(dto: CreateAsignacionHabitacionDto, userId: string) {
    const sesionAbierta = await this.getSesionAbiertaOrFail(userId);
    const noches = this.parseCantidadNoches(dto.cantidadNoches);
    const fechaIngreso = new Date();
    const fechaSalidaEstimada = this.calculateFechaSalidaEstimada(fechaIngreso, noches);

    const habitacion = await this.habitacionRepo.findOne({ where: { id: dto.habitacionId } });
    if (!habitacion) throw new NotFoundException('Habitación no encontrada');
    if (!habitacion.estadoActivo) throw new BadRequestException('La habitación no está activa');

    const huesped = await this.huespedRepo.findOne({
      where: { id: dto.huespedId },
      relations: { empresaHostal: true },
    });
    if (!huesped) throw new NotFoundException('Huésped no encontrado');

    const tipoCobro = huesped.empresaHostal
      ? AsignacionTipoCobro.EMPRESA_CONVENIO
      : AsignacionTipoCobro.DIRECTO;

    const precioHabitacion = Number(habitacion.precio);
    if (!Number.isFinite(precioHabitacion)) {
      throw new BadRequestException('Precio de habitación inválido');
    }
    const montoTotal = (precioHabitacion * noches).toFixed(2);

    if (tipoCobro === AsignacionTipoCobro.DIRECTO && !dto.medioPago) {
      throw new BadRequestException('Debes seleccionar medio de pago para cobro directo');
    }

    return this.dataSource.transaction(async (manager) => {
      const overlap = await manager
        .getRepository(AsignacionHabitacionEntity)
        .createQueryBuilder('a')
        .where('a.habitacion = :habitacionId', { habitacionId: habitacion.id })
        .andWhere('a.fechaIngreso < :fechaSalida', { fechaSalida: fechaSalidaEstimada })
        .andWhere('COALESCE(a.fechaSalidaReal, a.fechaSalidaEstimada) > :fechaIngreso', {
          fechaIngreso,
        })
        .getCount();

      if (overlap > 0) {
        throw new ConflictException('La habitación no está disponible en el rango indicado');
      }

      const asignacion = manager.getRepository(AsignacionHabitacionEntity).create({
        habitacion: { id: habitacion.id } as any,
        huesped: { id: huesped.id } as any,
        sesionApertura: { id: sesionAbierta.id } as any,
        fechaIngreso,
        fechaSalidaEstimada,
        fechaSalidaReal: null,
        estado: AsignacionEstado.ACTIVA,
        tipoCobro,
        noches,
      });

      const savedAsignacion = await manager.getRepository(AsignacionHabitacionEntity).save(asignacion);

      if (tipoCobro === AsignacionTipoCobro.DIRECTO) {
        const venta = manager.getRepository(VentaAlojamientoEntity).create({
          asignacion: { id: savedAsignacion.id } as any,
          sesionCaja: { id: sesionAbierta.id } as any,
          medioPago: dto.medioPago as MedioPago,
          montoTotal,
          estado: VentaAlojamientoEstado.CONFIRMADA,
        });
        await manager.getRepository(VentaAlojamientoEntity).save(venta);
      }

      return savedAsignacion;
    });
  }

  async checkoutAsignacion(asignacionId: string, userId: string) {
    const sesionAbierta = await this.getSesionAbiertaOrFail(userId);

    const asignacion = await this.asignacionRepo.findOne({
      where: { id: asignacionId },
      relations: { habitacion: true },
    });

    if (!asignacion) throw new NotFoundException('Asignación no encontrada');
    if (asignacion.estado === AsignacionEstado.FINALIZADA) {
      throw new ConflictException('La estadía ya se encuentra finalizada');
    }

    const ahora = new Date();
    asignacion.fechaSalidaReal = ahora;
    asignacion.estado = AsignacionEstado.FINALIZADA;
    asignacion.sesionCheckout = { id: sesionAbierta.id } as any;

    const saved = await this.asignacionRepo.save(asignacion);
    return {
      id: saved.id,
      estado: saved.estado,
      fechaSalidaReal: saved.fechaSalidaReal,
      habitacionId: (saved.habitacion as any)?.id,
    };
  }

  async getAsignacionActualByHabitacion(habitacionId: string) {
    const habitacion = await this.habitacionRepo.findOne({ where: { id: habitacionId } });
    if (!habitacion) throw new NotFoundException('Habitación no encontrada');

    const ahora = new Date();
    const asignacion = await this.asignacionRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.huesped', 'h')
      .leftJoinAndSelect('h.empresaHostal', 'e')
      .where('a.habitacion = :habitacionId', { habitacionId })
      .andWhere('a.fechaIngreso <= :ahora', { ahora })
      .andWhere('COALESCE(a.fechaSalidaReal, a.fechaSalidaEstimada) > :ahora', { ahora })
      .orderBy('a.fechaIngreso', 'DESC')
      .getOne();

    if (!asignacion) return null;

    const venta = await this.ventaAlojamientoRepo.findOne({
      where: { asignacion: { id: asignacion.id } } as any,
    });

    return {
      id: asignacion.id,
      noches: asignacion.noches,
      tipoCobro: asignacion.tipoCobro,
      fechaIngreso: asignacion.fechaIngreso,
      fechaSalidaEstimada: asignacion.fechaSalidaEstimada,
      huesped: asignacion.huesped,
      ventaAlojamiento: venta
        ? {
            id: venta.id,
            medioPago: venta.medioPago,
            montoTotal: venta.montoTotal,
            fechaConfirmacion: venta.fechaConfirmacion,
          }
        : null,
    };
  }

  async listVentasAlojamientoBySesion(sesionCajaId: number, userId: string) {
    if (!Number.isFinite(sesionCajaId) || sesionCajaId <= 0) {
      throw new BadRequestException('sesionCajaId inválido');
    }

    const sesion = await this.sesionRepo.findOne({
      where: { id: sesionCajaId, usuario: { idUsuario: userId } as any },
    });

    if (!sesion) throw new NotFoundException('Sesión de caja no encontrada');

    const rows = await this.ventaAlojamientoRepo.find({
      where: { sesionCaja: { id: sesionCajaId } as any, estado: VentaAlojamientoEstado.CONFIRMADA },
      relations: {
        asignacion: {
          habitacion: true,
          huesped: true,
        },
      },
      order: { fechaConfirmacion: 'DESC' },
    });

    return rows.map((row) => ({
      idVentaAlojamiento: row.id,
      fechaConfirmacion: row.fechaConfirmacion,
      medioPago: row.medioPago,
      montoTotal: row.montoTotal,
      asignacion: {
        id: row.asignacion.id,
        tipoCobro: row.asignacion.tipoCobro,
        noches: row.asignacion.noches,
        habitacion: {
          id: row.asignacion.habitacion.id,
          identificador: row.asignacion.habitacion.identificador,
        },
        huesped: {
          id: row.asignacion.huesped.id,
          nombreCompleto: row.asignacion.huesped.nombreCompleto,
        },
      },
    }));
  }

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
