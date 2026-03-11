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

    @InjectRepository(ProductoStockEntity)
    private readonly productoStockRepo: Repository<ProductoStockEntity>,

    @InjectRepository(IncidenciaResolucionAdminEntity)
    private readonly resolucionRepo: Repository<IncidenciaResolucionAdminEntity>,

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

    return this.obtenerDetalleInconsistencia(incidencia.id);
  }

  async listarInconsistenciasAdmin(filters: {
    estado?: 'PENDIENTE' | 'EN_REVISION' | IncidenciaResolucionEstadoFinal;
    tipo?: IncidenciaTipo;
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
      .leftJoinAndSelect('i.resolucionAdmin', 'r')
      .leftJoinAndSelect('r.adminResuelve', 'adminResuelve')
      .leftJoinAndSelect('r.ajusteAplicado', 'ajusteAplicado')
      .orderBy('i.fechaHoraDeteccion', 'DESC');

    if (filters.estado === 'PENDIENTE' || filters.estado === 'EN_REVISION') {
      qb.andWhere('r.id IS NULL');
    } else if (filters.estado) {
      qb.andWhere('r.estadoFinal = :estado', { estado: filters.estado });
    }
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
    const incidencia = await this.incidenciaRepo.findOne({
      where: { id },
      relations: {
        producto: true,
        ubicacion: true,
        sesionCaja: true,
        usuario: true,
        resolucionAdmin: { adminResuelve: true, ajusteAplicado: true },
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
          relations: { usuario: true },
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

    let ajusteId: number | null = null;
    if (estadoFinal === 'RESUELTA_CON_AJUSTE') {
      const ajuste = await this.inventarioService.registrarAjusteDesdeInconsistencia(
        {
          productoId: incidencia.producto.id,
          ubicacionId: ubicacionUsadaId,
          cantidad: diferencia,
          motivo: motivoResolucion,
          categoria: incidencia.tipo,
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
        categoria: incidencia.tipo,
        motivoResolucion,
        adminResuelve: { idUsuario: adminId } as any,
        ajusteAplicado: ajusteId ? ({ id: ajusteId } as any) : null,
        resolvedAt: new Date(),
      }),
    );

    return this.obtenerDetalleInconsistencia(incidencia.id);
  }

  async obtenerResumenPerdidas(params: { from?: string; to?: string }) {
    const from = params.from ? `${params.from}T00:00:00.000Z` : undefined;
    const to = params.to ? `${params.to}T23:59:59.999Z` : undefined;

    const qb = this.resolucionRepo
      .createQueryBuilder('r')
      .leftJoin('r.incidencia', 'i')
      .leftJoin('i.producto', 'p')
      .where('r.estadoFinal = :estado', { estado: 'RESUELTA_CON_AJUSTE' })
      .andWhere('r.categoria IN (:...tipos)', { tipos: ['FALTANTE', 'DANIO', 'VENCIDO', 'OTRO'] });

    if (from) qb.andWhere('r.resolvedAt >= :from', { from });
    if (to) qb.andWhere('r.resolvedAt <= :to', { to });

    const rows = await qb
      .select('p.id', 'productoId')
      .addSelect('p.name', 'productoNombre')
      .addSelect('r.categoria', 'categoria')
      .addSelect('SUM(ABS(COALESCE(r.diferencia::numeric, 0)))', 'cantidadPerdida')
      .addSelect(
        'SUM(ABS(COALESCE(r.diferencia::numeric, 0)) * COALESCE(p.precioCosto::numeric, 0))',
        'montoPerdida',
      )
      .groupBy('p.id')
      .addGroupBy('p.name')
      .addGroupBy('r.categoria')
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
