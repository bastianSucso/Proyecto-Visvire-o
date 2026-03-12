import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import {
  IncidenciaContexto,
  IncidenciaOrigen,
  IncidenciaStockEntity,
} from './entities/incidencia-stock.entity';
import { SesionCajaEntity } from './entities/sesion-caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import {
  CreateIncidenciaStockDto,
} from './dto/create-incidencia-stock.dto';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import {
  IncidenciaResolucionAdminEntity,
  IncidenciaResolucionEstadoFinal,
} from './entities/incidencia-resolucion-admin.entity';
import { CreateInconsistenciaAdminDto } from './dto/create-inconsistencia-admin.dto';
import { InventarioService } from '../inventario/inventario.service';
import { ResolverInconsistenciaDto } from './dto/resolver-inconsistencia.dto';
import { InconsistenciaCategoriaEntity } from './entities/inconsistencia-categoria.entity';
import { InconsistenciasCategoriasService } from './inconsistencias-categorias.service';
import { ConsultarPerdidasDto, ListarPerdidasProductosDto } from './dto/consultar-perdidas.dto';

@Injectable()
export class HistorialService {
  private readonly businessTimeZone = 'America/Santiago';

  constructor(
    @InjectRepository(SesionCajaEntity)
    private readonly sesionRepo: Repository<SesionCajaEntity>,

    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,

    @InjectRepository(IncidenciaStockEntity)
    private readonly incidenciaRepo: Repository<IncidenciaStockEntity>,

    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,

    @InjectRepository(ProductoStockEntity)
    private readonly productoStockRepo: Repository<ProductoStockEntity>,

    @InjectRepository(IncidenciaResolucionAdminEntity)
    private readonly resolucionRepo: Repository<IncidenciaResolucionAdminEntity>,

    private readonly inventarioService: InventarioService,
    private readonly inconsistenciasCategoriasService: InconsistenciasCategoriasService,
  ) {}

  private normalizeDateKey(value: string) {
    const dateKey = value.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      throw new BadRequestException('fecha inválida. Usa formato YYYY-MM-DD');
    }

    const [year, month, day] = dateKey.split('-').map((it) => Number(it));
    const test = new Date(Date.UTC(year, month - 1, day));
    const valid =
      test.getUTCFullYear() === year &&
      test.getUTCMonth() + 1 === month &&
      test.getUTCDate() === day;

    if (!valid) {
      throw new BadRequestException('fecha inválida. Usa formato YYYY-MM-DD');
    }

    return dateKey;
  }

  private normalizePage(page?: number) {
    if (!Number.isFinite(page ?? 1)) return 1;
    return Math.max(1, Number(page ?? 1));
  }

  private normalizePageSize(pageSize?: number) {
    if (!Number.isFinite(pageSize ?? 20)) return 20;
    return Math.min(100, Math.max(1, Number(pageSize ?? 20)));
  }

  private applyPerdidasFilters(
    qb: SelectQueryBuilder<IncidenciaResolucionAdminEntity>,
    params: ConsultarPerdidasDto,
  ) {
    const from = params.from ? this.normalizeDateKey(params.from) : null;
    const to = params.to ? this.normalizeDateKey(params.to) : null;

    if (from && to && from > to) {
      throw new BadRequestException('from no puede ser mayor a to');
    }

    if (from) {
      qb.andWhere('DATE(r.resolved_at AT TIME ZONE :tz) >= :from', {
        tz: this.businessTimeZone,
        from,
      });
    }

    if (to) {
      qb.andWhere('DATE(r.resolved_at AT TIME ZONE :tz) <= :to', {
        tz: this.businessTimeZone,
        to,
      });
    }

    if (params.categoriaId?.trim()) {
      qb.andWhere('c.id_inconsistencia_categoria = :categoriaId', {
        categoriaId: params.categoriaId.trim(),
      });
    }
  }

  private async getSalaVentaActivaOrThrow() {
    const sala = await this.ubicacionRepo.findOne({
      where: { tipo: 'SALA_VENTA', activa: true } as any,
      order: { createdAt: 'ASC' },
    });
    if (!sala) throw new BadRequestException('No existe sala de ventas activa');
    return sala;
  }

  private async getSesionActivaGlobal() {
    return this.sesionRepo.findOne({
      where: { fechaCierre: IsNull() },
      relations: { usuario: true, caja: true },
      order: { fechaApertura: 'DESC' },
    });
  }

  async obtenerSesionActivaAdmin() {
    const sesion = await this.getSesionActivaGlobal();
    if (!sesion) return null;

    return {
      sesionCajaId: sesion.id,
      fechaApertura: sesion.fechaApertura,
      caja: sesion.caja
        ? {
            idCaja: sesion.caja.idCaja,
            numero: sesion.caja.numero,
          }
        : null,
      vendedor: sesion.usuario
        ? {
            idUsuario: sesion.usuario.idUsuario,
            nombre: sesion.usuario.nombre ?? null,
            apellido: sesion.usuario.apellido ?? null,
            email: sesion.usuario.email ?? null,
          }
        : null,
    };
  }

  private async getStockTeoricoSistema(productoId: string, ubicacionId: string) {
    const stock = await this.productoStockRepo.findOne({
      where: {
        producto: { id: productoId },
        ubicacion: { id: ubicacionId },
      } as any,
    });

    return Number(stock?.cantidad ?? 0);
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

    const categoria = await this.inconsistenciasCategoriasService.findActiveOrThrow(dto.categoriaId);

    const inc = this.incidenciaRepo.create({
      sesionCaja,
      producto,
      ubicacion: sala,
      usuario: { idUsuario: usuarioId } as any,
      origen: 'VENDEDOR' as IncidenciaOrigen,
      contexto: 'DURANTE_JORNADA',
      fechaHoraDeteccion: dto.fechaHoraDeteccion ? new Date(dto.fechaHoraDeteccion) : new Date(),
      categoria,
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
        categoria: true,
        usuario: true,
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
      relations: {
        producto: true,
        ubicacion: true,
        sesionCaja: true,
        categoria: true,
        usuario: true,
      },
      order: { fecha: 'DESC' },
    });
  }

  async crearInconsistenciaAdmin(dto: CreateInconsistenciaAdminDto, adminId: string) {
    const sesionActiva = await this.getSesionActivaGlobal();
    const contexto: IncidenciaContexto = sesionActiva ? 'DURANTE_JORNADA' : 'FUERA_JORNADA';
    const sesionCaja = sesionActiva ?? null;

    if (contexto === 'FUERA_JORNADA' && !dto.observacion?.trim()) {
      throw new BadRequestException('observacion es obligatoria para incidencias fuera de jornada');
    }

    const producto = await this.productoRepo.findOne({ where: { id: dto.productoId } });
    if (!producto) throw new BadRequestException('Producto no existe');

    const ubicacion = await this.ubicacionRepo.findOne({ where: { id: dto.ubicacionId } });
    if (!ubicacion) throw new BadRequestException('Ubicación no existe');

    const categoria = await this.inconsistenciasCategoriasService.findActiveOrThrow(dto.categoriaId);

    const incidencia = await this.incidenciaRepo.save(
      this.incidenciaRepo.create({
        sesionCaja,
        producto,
        ubicacion,
        usuario: { idUsuario: adminId } as any,
        origen: 'ADMIN',
        contexto,
        fechaHoraDeteccion: dto.fechaHoraDeteccion ? new Date(dto.fechaHoraDeteccion) : new Date(),
        categoria,
        cantidad: Number(dto.cantidad).toFixed(3),
        observacion: dto.observacion?.trim() || null,
      }),
    );

    return this.obtenerDetalleInconsistencia(incidencia.id);
  }

  async listarInconsistenciasAdmin(filters: {
    estado?: 'PENDIENTE' | 'EN_REVISION' | IncidenciaResolucionEstadoFinal;
    categoriaId?: string;
    contexto?: IncidenciaContexto;
    productoId?: string;
    sesionCajaId?: number;
    fecha?: string;
  }) {
    const qb = this.incidenciaRepo
      .createQueryBuilder('i')
      .leftJoinAndSelect('i.producto', 'producto')
      .leftJoinAndSelect('i.ubicacion', 'ubicacion')
      .leftJoinAndSelect('i.sesionCaja', 'sesion')
      .leftJoinAndSelect('i.usuario', 'usuario')
      .leftJoinAndSelect('i.categoria', 'categoria')
      .leftJoinAndSelect('i.resolucionAdmin', 'r')
      .leftJoinAndSelect('r.categoria', 'categoriaResolucion')
      .leftJoinAndSelect('r.adminResuelve', 'adminResuelve')
      .leftJoinAndSelect('r.ajusteAplicado', 'ajusteAplicado')
      .orderBy('i.fechaHoraDeteccion', 'DESC');

    if (filters.estado === 'PENDIENTE' || filters.estado === 'EN_REVISION') {
      qb.andWhere('r.id IS NULL');
    } else if (filters.estado) {
      qb.andWhere('r.estadoFinal = :estado', { estado: filters.estado });
    }
    if (filters.categoriaId) {
      qb.andWhere('categoria.id = :categoriaId', { categoriaId: filters.categoriaId });
    }
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
    const incidencia = await this.incidenciaRepo.findOne({
      where: { id },
      relations: {
        producto: true,
        ubicacion: true,
        categoria: true,
        sesionCaja: true,
        usuario: true,
        resolucionAdmin: { adminResuelve: true, ajusteAplicado: true, categoria: true },
      },
    });
    if (!incidencia) throw new NotFoundException('Inconsistencia no encontrada');

    const constanciasVendedor = incidencia.sesionCaja
      ? await this.incidenciaRepo.find({
          where: {
            sesionCaja: { id: incidencia.sesionCaja.id },
            producto: { id: incidencia.producto.id },
            origen: 'VENDEDOR',
          } as any,
          relations: { usuario: true, categoria: true },
          order: { fecha: 'DESC' },
          take: 20,
        })
      : [];

    const stockTeoricoSistema = await this.getStockTeoricoSistema(
      incidencia.producto.id,
      incidencia.ubicacion.id,
    );

    return {
      ...incidencia,
      estado:
        incidencia.resolucionAdmin?.estadoFinal ??
        ('PENDIENTE' as 'PENDIENTE' | IncidenciaResolucionEstadoFinal),
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
      stockTeoricoSistema: Number(stockTeoricoSistema.toFixed(3)),
      ubicacionUsadaResolucion: {
        id: incidencia.ubicacion.id,
        nombre: incidencia.ubicacion.nombre,
        tipo: incidencia.ubicacion.tipo,
      },
      constanciasVendedor,
    };
  }

  async resolverInconsistencia(id: number, dto: ResolverInconsistenciaDto, adminId: string) {
    const incidencia = await this.incidenciaRepo.findOne({
      where: { id },
      relations: {
        producto: true,
        ubicacion: true,
        categoria: true,
        resolucionAdmin: true,
      },
    });
    if (!incidencia) throw new NotFoundException('Inconsistencia no encontrada');
    if (incidencia.resolucionAdmin) {
      throw new BadRequestException('La inconsistencia ya fue resuelta');
    }

    const ubicacionUsadaId = incidencia.ubicacion.id;
    const stockTeorico = await this.getStockTeoricoSistema(incidencia.producto.id, ubicacionUsadaId);
    const stockRealObservado = Number(dto.stockRealObservado);
    if (!Number.isFinite(stockRealObservado)) {
      throw new BadRequestException('stockRealObservado debe ser numérico');
    }
    if (stockRealObservado < 0) {
      throw new BadRequestException('stockRealObservado no puede ser negativo');
    }

    const motivoResolucion = dto.motivoResolucion?.trim();
    if (!motivoResolucion) {
      throw new BadRequestException('motivoResolucion es obligatorio');
    }

    if (stockRealObservado > stockTeorico) {
      throw new BadRequestException(
        'No puedes ajustar por inconsistencia cuando stock real supera al teórico. Registra el excedente por ingreso de producto.',
      );
    }

    const diferencia = stockRealObservado - stockTeorico;
    const estadoFinal: IncidenciaResolucionEstadoFinal =
      diferencia < 0 ? 'RESUELTA_CON_AJUSTE' : 'RESUELTA_SIN_AJUSTE';
    const precioCostoSnapshot = Number(incidencia.producto.precioCosto ?? 0);
    const cantidadPerdida = estadoFinal === 'RESUELTA_CON_AJUSTE' ? Math.abs(diferencia) : 0;
    const montoPerdidaSnapshot = Number((cantidadPerdida * precioCostoSnapshot).toFixed(2));

    let ajusteId: number | null = null;
    if (estadoFinal === 'RESUELTA_CON_AJUSTE') {
      const ajuste = await this.inventarioService.registrarAjusteDesdeInconsistencia(
        {
          productoId: incidencia.producto.id,
          ubicacionId: ubicacionUsadaId,
          cantidad: diferencia,
          motivo: motivoResolucion,
          categoria: incidencia.categoria.codigo,
        },
        adminId,
      );
      ajusteId = ajuste.id;
    }

    await this.resolucionRepo.save(
      this.resolucionRepo.create({
        incidencia: { id: incidencia.id } as IncidenciaStockEntity,
        estadoFinal,
        stockTeorico: stockTeorico.toFixed(3),
        stockRealObservado: stockRealObservado.toFixed(3),
        diferencia: diferencia.toFixed(3),
        precioCostoSnapshot: precioCostoSnapshot.toFixed(2),
        montoPerdidaSnapshot: montoPerdidaSnapshot.toFixed(2),
        moneda: 'CLP',
        categoria: { id: incidencia.categoria.id } as InconsistenciaCategoriaEntity,
        motivoResolucion,
        adminResuelve: { idUsuario: adminId } as any,
        ajusteAplicado: ajusteId ? ({ id: ajusteId } as any) : null,
        resolvedAt: new Date(),
      }),
    );

    return this.obtenerDetalleInconsistencia(incidencia.id);
  }

  async obtenerResumenPerdidas(params: ConsultarPerdidasDto) {
    const qb = this.resolucionRepo
      .createQueryBuilder('r')
      .leftJoin('r.incidencia', 'i')
      .leftJoin('i.producto', 'p')
      .leftJoin('r.categoria', 'c')
      .where('r.estado_final = :estado', { estado: 'RESUELTA_CON_AJUSTE' });

    this.applyPerdidasFilters(qb, params);

    const rows = await qb
      .select('c.id_inconsistencia_categoria', 'categoriaId')
      .addSelect('c.codigo', 'categoria')
      .addSelect('c.nombre', 'categoriaNombre')
      .addSelect('COALESCE(SUM(r.monto_perdida_snapshot::numeric), 0)', 'montoPerdida')
      .addSelect('COALESCE(SUM(ABS(r.diferencia::numeric)), 0)', 'cantidadPerdida')
      .groupBy('c.id_inconsistencia_categoria')
      .addGroupBy('c.codigo')
      .addGroupBy('c.nombre')
      .orderBy('COALESCE(SUM(r.monto_perdida_snapshot::numeric), 0)', 'DESC')
      .getRawMany<{
        categoriaId: string;
        categoria: string;
        categoriaNombre: string;
        cantidadPerdida: string;
        montoPerdida: string;
      }>();

    const totalsRow = await qb
      .clone()
      .select('COALESCE(SUM(r.monto_perdida_snapshot::numeric), 0)', 'totalMontoPerdida')
      .addSelect('COALESCE(SUM(ABS(r.diferencia::numeric)), 0)', 'totalCantidadPerdida')
      .addSelect('COUNT(DISTINCT p.id)', 'totalProductosAfectados')
      .getRawOne<{ totalMontoPerdida: string; totalCantidadPerdida: string; totalProductosAfectados: string }>();

    const totalMonto = Number(totalsRow?.totalMontoPerdida ?? 0);
    const totalCantidad = Number(totalsRow?.totalCantidadPerdida ?? 0);
    const totalProductosAfectados = Number(totalsRow?.totalProductosAfectados ?? 0);

    const categorias = rows
      .map((row) => {
        const montoPerdida = Number(row.montoPerdida ?? 0);
        return {
          categoriaId: row.categoriaId,
          codigo: row.categoria,
          nombre: row.categoriaNombre,
          montoPerdida: Number(montoPerdida.toFixed(2)),
          cantidadPerdida: Number(Number(row.cantidadPerdida ?? 0).toFixed(3)),
          porcentajeMonto: totalMonto > 0 ? Number(((montoPerdida / totalMonto) * 100).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.montoPerdida - a.montoPerdida);

    return {
      totalMontoPerdida: Number(totalMonto.toFixed(2)),
      totalCantidadPerdida: Number(totalCantidad.toFixed(3)),
      totalProductosAfectados,
      totalCategoriasAfectadas: categorias.length,
      categorias,
    };
  }

  async listarPerdidasProductos(params: ListarPerdidasProductosDto) {
    const page = this.normalizePage(params.page);
    const pageSize = this.normalizePageSize(params.pageSize);
    const sortBy = params.sortBy === 'cantidadPerdida' ? 'cantidadPerdida' : 'montoPerdida';
    const sortDir = params.sortDir === 'asc' ? 'ASC' : 'DESC';
    const offset = (page - 1) * pageSize;

    const baseQb = this.resolucionRepo
      .createQueryBuilder('r')
      .leftJoin('r.incidencia', 'i')
      .leftJoin('i.producto', 'p')
      .leftJoin('r.categoria', 'c')
      .where('r.estado_final = :estado', { estado: 'RESUELTA_CON_AJUSTE' });

    this.applyPerdidasFilters(baseQb, params);

    const totalRow = await baseQb
      .clone()
      .select('COUNT(DISTINCT p.id)', 'totalItems')
      .getRawOne<{ totalItems: string }>();

    const totalItems = Number(totalRow?.totalItems ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const montoExpr = 'COALESCE(SUM(r.monto_perdida_snapshot::numeric), 0)';
    const cantidadExpr = 'COALESCE(SUM(ABS(r.diferencia::numeric)), 0)';
    const orderExpr = sortBy === 'cantidadPerdida' ? cantidadExpr : montoExpr;

    const rows = await baseQb
      .clone()
      .select('p.id', 'productoId')
      .addSelect('p.name', 'productoNombre')
      .addSelect(cantidadExpr, 'cantidadPerdida')
      .addSelect(montoExpr, 'montoPerdida')
      .addSelect('MAX(r.resolved_at)', 'ultimaResolucionAt')
      .groupBy('p.id')
      .addGroupBy('p.name')
      .orderBy(orderExpr, sortDir)
      .addOrderBy('MAX(r.resolved_at)', 'DESC')
      .offset(offset)
      .limit(pageSize)
      .getRawMany<{
        productoId: string;
        productoNombre: string;
        cantidadPerdida: string;
        montoPerdida: string;
        ultimaResolucionAt: Date;
      }>();

    return {
      items: rows.map((row) => ({
        productoId: row.productoId,
        productoNombre: row.productoNombre,
        cantidadPerdida: Number(Number(row.cantidadPerdida ?? 0).toFixed(3)),
        montoPerdida: Number(Number(row.montoPerdida ?? 0).toFixed(2)),
        ultimaResolucionAt: row.ultimaResolucionAt,
      })),
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages,
      },
    };
  }
}
