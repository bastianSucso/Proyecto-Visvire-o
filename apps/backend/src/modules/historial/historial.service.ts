import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import {
  IncidenciaContexto,
  IncidenciaOrigen,
  IncidenciaStockEntity,
  IncidenciaTipo,
} from './entities/incidencia-stock.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import {
  CreateIncidenciaStockDto,
  IncidenciaContextoDto,
} from './dto/create-incidencia-stock.dto';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import {
  IncidenciaRevisionAdminEntity,
  IncidenciaRevisionEstado,
} from './entities/incidencia-revision-admin.entity';
import {
  IncidenciaRevisionAccion,
  IncidenciaRevisionBitacoraEntity,
} from './entities/incidencia-revision-bitacora.entity';
import { CreateInconsistenciaAdminDto } from './dto/create-inconsistencia-admin.dto';
import { InventarioService } from '../inventario/inventario.service';
import { CreateIncidenciaBitacoraDto } from './dto/create-incidencia-bitacora.dto';
import { CambiarEstadoIncidenciaDto } from './dto/cambiar-estado-incidencia.dto';
import { ResolverInconsistenciaConAjusteDto } from './dto/resolver-inconsistencia-con-ajuste.dto';

@Injectable()
export class HistorialService {
  constructor(
    @InjectRepository(SesionCajaEntity)
    private readonly sesionRepo: Repository<SesionCajaEntity>,

    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,

    @InjectRepository(IncidenciaStockEntity)
    private readonly incidenciaRepo: Repository<IncidenciaStockEntity>,

    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,

    @InjectRepository(IncidenciaRevisionAdminEntity)
    private readonly revisionRepo: Repository<IncidenciaRevisionAdminEntity>,

    @InjectRepository(IncidenciaRevisionBitacoraEntity)
    private readonly bitacoraRepo: Repository<IncidenciaRevisionBitacoraEntity>,

    private readonly inventarioService: InventarioService,
  ) {}

  private async getSalaVentaActivaOrThrow() {
    const sala = await this.ubicacionRepo.findOne({
      where: { tipo: 'SALA_VENTA', activa: true } as any,
      order: { createdAt: 'ASC' },
    });
    if (!sala) throw new BadRequestException('No existe sala de ventas activa');
    return sala;
  }

  private async getSesionOrThrow(sesionCajaId: number) {
    const sesion = await this.sesionRepo.findOne({ where: { id: sesionCajaId }, relations: { caja: true } });
    if (!sesion) throw new BadRequestException('Sesión de caja no existe');
    return sesion;
  }

  private normalizeContexto(contexto?: IncidenciaContextoDto): IncidenciaContexto {
    return (contexto ?? 'DURANTE_JORNADA') as IncidenciaContexto;
  }

  private async resolveSesionByContexto(
    contexto: IncidenciaContexto,
    sesionCajaId: number | undefined,
  ): Promise<SesionCajaEntity | null> {
    if (contexto === 'DURANTE_JORNADA') {
      if (!sesionCajaId) {
        throw new BadRequestException(
          'sesionCajaId es requerido cuando contexto es DURANTE_JORNADA',
        );
      }
      return this.getSesionOrThrow(sesionCajaId);
    }

    return null;
  }

  private async addBitacora(
    revision: IncidenciaRevisionAdminEntity,
    adminId: string,
    payload: {
      accion: IncidenciaRevisionAccion;
      descripcion: string;
      estadoResultante?: IncidenciaRevisionEstado | null;
      metadata?: Record<string, unknown> | null;
    },
  ) {
    const row = this.bitacoraRepo.create({
      revision,
      accion: payload.accion,
      descripcion: payload.descripcion,
      estadoResultante: payload.estadoResultante ?? null,
      metadata: payload.metadata ?? null,
      adminAutor: { idUsuario: adminId } as any,
    });
    return this.bitacoraRepo.save(row);
  }

  async crearIncidencia(dto: CreateIncidenciaStockDto, usuarioId: string) {
    const sesionId = dto.sesionCajaId;
    if (!sesionId) throw new BadRequestException('Falta sesionCajaId');

    const sesionCaja = await this.sesionRepo.findOne({
      where: {
        id: sesionId,
        usuario: { idUsuario: usuarioId },
        fechaCierre: IsNull(),
      },
    });
    if (!sesionCaja) {
      throw new BadRequestException('Sesión de caja no existe o no está activa');
    }

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new BadRequestException('Producto no existe');

    const sala = dto.ubicacionId
      ? await this.ubicacionRepo.findOne({ where: { id: dto.ubicacionId } })
      : await this.getSalaVentaActivaOrThrow();
    if (!sala) throw new BadRequestException('Ubicación no existe');

    const inc = this.incidenciaRepo.create({
      sesionCaja,
      producto,
      ubicacion: sala,
      usuario: { idUsuario: usuarioId } as any,
      origen: 'VENDEDOR' as IncidenciaOrigen,
      contexto: 'DURANTE_JORNADA',
      fechaHoraDeteccion: dto.fechaHoraDeteccion ? new Date(dto.fechaHoraDeteccion) : new Date(),
      tipo: dto.tipo,
      cantidad: Number(dto.cantidad).toFixed(3),
      observacion: dto.observacion ?? null,
    });

    return this.incidenciaRepo.save(inc);
  }

  async listarIncidenciasPorUsuario(userId: string) {
    return this.incidenciaRepo.find({
      where: [{ sesionCaja: { usuario: { idUsuario: userId } } }],
      relations: {
        producto: true,
        ubicacion: true,
        sesionCaja: true,
      },
      order: {
        fecha: 'DESC',
      },
    });
  }

  async listarIncidenciasTurnoActual(userId: string) {
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
      relations: { producto: true, ubicacion: true, sesionCaja: true },
      order: { fecha: 'DESC' },
    });
  }

  async crearInconsistenciaAdmin(dto: CreateInconsistenciaAdminDto, adminId: string) {
    const contexto = this.normalizeContexto(dto.contexto);
    const sesionCaja = await this.resolveSesionByContexto(contexto, dto.sesionCajaId);

    if (contexto === 'FUERA_JORNADA' && !dto.observacion?.trim()) {
      throw new BadRequestException('observacion es obligatoria para incidencias fuera de jornada');
    }

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new BadRequestException('Producto no existe');

    const ubicacion = dto.ubicacionId
      ? await this.ubicacionRepo.findOne({ where: { id: dto.ubicacionId } })
      : await this.getSalaVentaActivaOrThrow();
    if (!ubicacion) throw new BadRequestException('Ubicación no existe');

    const incidencia = await this.incidenciaRepo.save(
      this.incidenciaRepo.create({
        sesionCaja,
        producto,
        ubicacion,
        usuario: { idUsuario: adminId } as any,
        origen: 'ADMIN',
        contexto,
        fechaHoraDeteccion: dto.fechaHoraDeteccion ? new Date(dto.fechaHoraDeteccion) : new Date(),
        tipo: dto.tipo as IncidenciaTipo,
        cantidad: Number(dto.cantidad).toFixed(3),
        observacion: dto.observacion?.trim() || null,
      }),
    );

    const stockTeorico = Number(dto.stockTeorico);
    const stockRealObservado = Number(dto.stockRealObservado);
    const costoUnitarioSnapshot = Number(dto.costoUnitarioSnapshot ?? producto.precioCosto ?? 0);

    const revision = await this.revisionRepo.save(
      this.revisionRepo.create({
        incidencia,
        stockTeorico: stockTeorico.toFixed(3),
        stockRealObservado: stockRealObservado.toFixed(3),
        diferencia: (stockRealObservado - stockTeorico).toFixed(3),
        costoUnitarioSnapshot: costoUnitarioSnapshot.toFixed(2),
        estado: 'PENDIENTE',
        ajusteAplicado: null,
        adminAutor: { idUsuario: adminId } as any,
        adminResuelve: null,
        resolvedAt: null,
      }),
    );

    await this.addBitacora(revision, adminId, {
      accion: 'OBSERVACION',
      descripcion: dto.observacion?.trim() || 'Inconsistencia registrada por administrador',
      estadoResultante: 'PENDIENTE',
      metadata: {
        stockTeorico,
        stockRealObservado,
        diferencia: stockRealObservado - stockTeorico,
      },
    });

    return this.obtenerDetalleInconsistencia(revision.id);
  }

  async listarInconsistenciasAdmin(filters: {
    estado?: IncidenciaRevisionEstado;
    tipo?: IncidenciaTipo;
    contexto?: IncidenciaContexto;
    productoId?: string;
    sesionCajaId?: number;
    fecha?: string;
  }) {
    const qb = this.revisionRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.incidencia', 'i')
      .leftJoinAndSelect('i.producto', 'producto')
      .leftJoinAndSelect('i.ubicacion', 'ubicacion')
      .leftJoinAndSelect('i.sesionCaja', 'sesion')
      .leftJoinAndSelect('i.usuario', 'usuario')
      .orderBy('r.createdAt', 'DESC');

    if (filters.estado) qb.andWhere('r.estado = :estado', { estado: filters.estado });
    if (filters.tipo) qb.andWhere('i.tipo = :tipo', { tipo: filters.tipo });
    if (filters.contexto) qb.andWhere('i.contexto = :contexto', { contexto: filters.contexto });
    if (filters.productoId) qb.andWhere('producto.id = :productoId', { productoId: filters.productoId });
    if (filters.sesionCajaId) qb.andWhere('sesion.id = :sesionCajaId', { sesionCajaId: filters.sesionCajaId });
    if (filters.fecha) {
      qb.andWhere(`DATE(timezone('America/Santiago', i.fecha_hora_deteccion)) = :fecha`, {
        fecha: filters.fecha,
      });
    }

    return qb.getMany();
  }

  async obtenerDetalleInconsistencia(id: number) {
    const revision = await this.revisionRepo.findOne({
      where: { id },
      relations: {
        incidencia: {
          producto: true,
          ubicacion: true,
          sesionCaja: true,
          usuario: true,
        },
        ajusteAplicado: true,
        adminAutor: true,
        adminResuelve: true,
      },
    });
    if (!revision) throw new NotFoundException('Inconsistencia no encontrada');

    const bitacora = await this.bitacoraRepo.find({
      where: { revision: { id: revision.id } as any },
      relations: { adminAutor: true },
      order: { createdAt: 'ASC' },
    });

    const incidencia = revision.incidencia;
    const constanciasVendedor = incidencia.sesionCaja
      ? await this.incidenciaRepo.find({
          where: {
            sesionCaja: { id: incidencia.sesionCaja.id },
            producto: { id: incidencia.producto.id },
            origen: 'VENDEDOR',
          } as any,
          relations: { usuario: true },
          order: { fecha: 'DESC' },
          take: 20,
        })
      : [];

    return {
      ...revision,
      bitacora,
      contextoJornada: incidencia.sesionCaja
        ? {
            sesionCajaId: incidencia.sesionCaja.id,
            fechaApertura: incidencia.sesionCaja.fechaApertura,
            fechaCierre: incidencia.sesionCaja.fechaCierre,
            totalVentas: incidencia.sesionCaja.totalVentas,
            cantidadVentas: incidencia.sesionCaja.cantidadVentas,
            totalEfectivo: incidencia.sesionCaja.totalEfectivo,
            totalTarjeta: incidencia.sesionCaja.totalTarjeta,
          }
        : null,
      constanciasVendedor,
    };
  }

  async agregarBitacora(id: number, dto: CreateIncidenciaBitacoraDto, adminId: string) {
    const revision = await this.revisionRepo.findOne({ where: { id } });
    if (!revision) throw new NotFoundException('Inconsistencia no encontrada');

    const bit = await this.addBitacora(revision, adminId, {
      accion: dto.accion ?? 'OBSERVACION',
      descripcion: dto.descripcion,
      estadoResultante: dto.estadoResultante ?? null,
    });

    return bit;
  }

  async cambiarEstado(id: number, dto: CambiarEstadoIncidenciaDto, adminId: string) {
    const revision = await this.revisionRepo.findOne({ where: { id } });
    if (!revision) throw new NotFoundException('Inconsistencia no encontrada');

    if (dto.estado === 'RESUELTA_CON_AJUSTE' && !revision.ajusteAplicado) {
      throw new BadRequestException('No se puede cerrar con ajuste sin registrar un ajuste aplicado');
    }

    revision.estado = dto.estado;
    if (dto.estado === 'RESUELTA_CON_AJUSTE' || dto.estado === 'RESUELTA_SIN_AJUSTE') {
      revision.resolvedAt = new Date();
      revision.adminResuelve = { idUsuario: adminId } as any;
    }

    await this.revisionRepo.save(revision);
    await this.addBitacora(revision, adminId, {
      accion: 'CAMBIO_ESTADO',
      descripcion: dto.descripcion?.trim() || `Estado actualizado a ${dto.estado}`,
      estadoResultante: dto.estado,
    });

    return this.obtenerDetalleInconsistencia(id);
  }

  async resolverConAjuste(id: number, dto: ResolverInconsistenciaConAjusteDto, adminId: string) {
    const revision = await this.revisionRepo.findOne({
      where: { id },
      relations: { incidencia: { producto: true, ubicacion: true } },
    });
    if (!revision) throw new NotFoundException('Inconsistencia no encontrada');

    if (dto.cantidadAjuste >= 0) {
      throw new BadRequestException('cantidadAjuste debe ser negativa para descuento de stock');
    }

    const incidencia = revision.incidencia;
    const ajuste = await this.inventarioService.registrarAjusteDesdeInconsistencia(
      {
        productoId: incidencia.producto.id,
        ubicacionId: dto.ubicacionId ?? incidencia.ubicacion.id,
        cantidad: dto.cantidadAjuste,
        motivo: dto.motivo,
        categoria: dto.categoria ?? incidencia.tipo,
      },
      adminId,
    );

    revision.ajusteAplicado = { id: ajuste.id } as any;
    revision.estado = 'RESUELTA_CON_AJUSTE';
    revision.adminResuelve = { idUsuario: adminId } as any;
    revision.resolvedAt = new Date();
    await this.revisionRepo.save(revision);

    await this.addBitacora(revision, adminId, {
      accion: 'AJUSTE_STOCK',
      descripcion: dto.descripcion?.trim() || dto.motivo,
      estadoResultante: 'RESUELTA_CON_AJUSTE',
      metadata: {
        ajusteId: ajuste.id,
        cantidadAjuste: dto.cantidadAjuste,
        categoria: dto.categoria ?? incidencia.tipo,
      },
    });

    return this.obtenerDetalleInconsistencia(id);
  }

  async obtenerResumenPerdidas(params: { from?: string; to?: string }) {
    const from = params.from ? `${params.from}T00:00:00.000Z` : undefined;
    const to = params.to ? `${params.to}T23:59:59.999Z` : undefined;

    const qb = this.revisionRepo
      .createQueryBuilder('r')
      .leftJoin('r.incidencia', 'i')
      .leftJoin('i.producto', 'p')
      .where('r.estado = :estado', { estado: 'RESUELTA_CON_AJUSTE' })
      .andWhere('i.tipo IN (:...tipos)', { tipos: ['FALTANTE', 'DANIO', 'VENCIDO', 'OTRO'] });

    if (from) qb.andWhere('r.updated_at >= :from', { from });
    if (to) qb.andWhere('r.updated_at <= :to', { to });

    const rows = await qb
      .select('p.id', 'productoId')
      .addSelect('p.name', 'productoNombre')
      .addSelect('i.tipo', 'categoria')
      .addSelect('SUM(ABS(COALESCE(r.diferencia::numeric, 0)))', 'cantidadPerdida')
      .addSelect(
        'SUM(ABS(COALESCE(r.diferencia::numeric, 0)) * COALESCE(r.costo_unitario_snapshot::numeric, 0))',
        'montoPerdida',
      )
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('i.tipo')
      .orderBy('montoPerdida', 'DESC')
      .getRawMany<{
        productoId: string;
        productoNombre: string;
        categoria: string;
        cantidadPerdida: string;
        montoPerdida: string;
      }>();

    const totalMonto = rows.reduce((acc, it) => acc + Number(it.montoPerdida ?? 0), 0);
    const totalCantidad = rows.reduce((acc, it) => acc + Number(it.cantidadPerdida ?? 0), 0);

    const topProductosMap = new Map<
      string,
      { productoId: string; productoNombre: string; cantidadPerdida: number; montoPerdida: number }
    >();
    for (const row of rows) {
      const key = row.productoId;
      const current = topProductosMap.get(key) ?? {
        productoId: row.productoId,
        productoNombre: row.productoNombre,
        cantidadPerdida: 0,
        montoPerdida: 0,
      };
      current.cantidadPerdida += Number(row.cantidadPerdida ?? 0);
      current.montoPerdida += Number(row.montoPerdida ?? 0);
      topProductosMap.set(key, current);
    }

    return {
      totalMontoPerdida: Number(totalMonto.toFixed(2)),
      totalCantidadPerdida: Number(totalCantidad.toFixed(3)),
      topProductos: Array.from(topProductosMap.values())
        .sort((a, b) => b.montoPerdida - a.montoPerdida)
        .slice(0, 10),
      distribucionCategoria: rows
        .reduce(
          (acc, row) => {
            const key = row.categoria;
            acc[key] = Number((acc[key] ?? 0) + Number(row.montoPerdida ?? 0));
            return acc;
          },
          {} as Record<string, number>,
        ),
    };
  }
}
