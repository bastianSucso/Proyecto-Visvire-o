import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';

import { CajaEntity } from './entities/caja.entity';
import { SesionCajaEntity, SesionCajaEstado } from '../historial/entities/sesion-caja.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { StockSesionCajaEntity } from '../historial/entities/stock-sesion-caja.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { VentaEntity, VentaEstado, MedioPago } from '../ventas/entities/venta.entity';

import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { UpdateCajaDto } from './dto/update-caja.dto';
import { CreateCajaDto } from './dto/create-caja.dto';

@Injectable()
export class CajaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CajaEntity) private readonly cajaRepo: Repository<CajaEntity>,
    @InjectRepository(SesionCajaEntity) private readonly sesionRepo: Repository<SesionCajaEntity>,
    @InjectRepository(ProductoEntity) private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(StockSesionCajaEntity) private readonly stockSesionRepo: Repository<StockSesionCajaEntity>,
    @InjectRepository(ProductoStockEntity) private readonly productoStockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(UbicacionEntity) private readonly ubicacionRepo: Repository<UbicacionEntity>,
    @InjectRepository(VentaEntity) private readonly ventaRepo: Repository<VentaEntity>,
  ) {}

  // =========================
  // Helpers
  // =========================

  private normalizeNumero(numero: unknown): string {
    const s = String(numero ?? '').trim();
    if (!s) throw new BadRequestException('numero es requerido');
    if (s.length > 30) throw new BadRequestException('numero demasiado largo (máx 30)');
    return s;
  }

  private async getCajaFisicaPorDefecto(): Promise<CajaEntity> {
    const caja = await this.cajaRepo.findOne({
      where: { activa: true },
      order: { idCaja: 'ASC' },
    });
    if (!caja) {
      throw new BadRequestException('No existe caja física activa. Crea una Caja primero.');
    }
    return caja;
  }

  private async getCajaFisicaByIdOrThrow(idCaja: number): Promise<CajaEntity> {
    if (!Number.isFinite(idCaja) || idCaja <= 0) {
      throw new BadRequestException('cajaId inválido');
    }

    const caja = await this.cajaRepo.findOne({ where: { idCaja } });
    if (!caja) throw new NotFoundException(`Caja física #${idCaja} no existe`);
    return caja;
  }

  private async getSalaVentaActivaOrThrow(): Promise<UbicacionEntity> {
    const sala = await this.ubicacionRepo.findOne({
      where: { tipo: 'SALA_VENTA', activa: true } as any,
      order: { createdAt: 'ASC' },
    });
    if (!sala) throw new BadRequestException('No existe sala de ventas activa.');
    return sala;
  }

  private normalizeMoney(value: unknown) {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  private async getResumenVentasSesion(sesionId: number) {
    const row = await this.ventaRepo
      .createQueryBuilder('v')
      .select('COALESCE(SUM(v.total_venta::numeric), 0)', 'totalVentas')
      .addSelect('COUNT(*)', 'cantidadVentas')
      .addSelect(
        'COALESCE(SUM(CASE WHEN v.medio_pago = :efectivo THEN v.total_venta::numeric ELSE 0 END), 0)',
        'totalEfectivo',
      )
      .addSelect(
        'COALESCE(SUM(CASE WHEN v.medio_pago = :tarjeta THEN v.total_venta::numeric ELSE 0 END), 0)',
        'totalTarjeta',
      )
      .where('v.id_sesioncaja = :sesionId', { sesionId })
      .andWhere('v.estado = :estado', { estado: VentaEstado.CONFIRMADA })
      .setParameters({ efectivo: MedioPago.EFECTIVO, tarjeta: MedioPago.TARJETA })
      .getRawOne<{
        totalVentas: string;
        cantidadVentas: string;
        totalEfectivo: string;
        totalTarjeta: string;
      }>();

    const totalVentas = Number(row?.totalVentas ?? 0).toFixed(2);
    const cantidadVentas = Number(row?.cantidadVentas ?? 0);
    const totalEfectivo = Number(row?.totalEfectivo ?? 0).toFixed(2);
    const totalTarjeta = Number(row?.totalTarjeta ?? 0).toFixed(2);

    return { totalVentas, cantidadVentas, totalEfectivo, totalTarjeta };
  }

  private buildResumenResponse(sesion: SesionCajaEntity, resumen: {
    totalVentas: string;
    cantidadVentas: number;
    totalEfectivo: string;
    totalTarjeta: string;
  }) {
    const montoInicial = this.normalizeMoney(sesion.montoInicial);
    const totalEfectivo = this.normalizeMoney(resumen.totalEfectivo);
    const totalTarjeta = this.normalizeMoney(resumen.totalTarjeta);
    const totalVentas = this.normalizeMoney(resumen.totalVentas);

    return {
      sesionCajaId: sesion.id,
      estado: sesion.estado,
      fechaApertura: sesion.fechaApertura,
      fechaCierre: sesion.fechaCierre,
      montoInicial: sesion.montoInicial,
      montoFinal: sesion.montoFinal,
      totalVentas: totalVentas.toFixed(2),
      cantidadVentas: resumen.cantidadVentas,
      totalEfectivo: totalEfectivo.toFixed(2),
      totalTarjeta: totalTarjeta.toFixed(2),
      montoTotalCaja: (montoInicial + totalEfectivo).toFixed(2),
    };
  }

  // =========================
  // ADMIN: CRUD Caja física
  // =========================

  async crearCajaFisica(dto: CreateCajaDto) {
    const numero = this.normalizeNumero(dto.numero);
    const activa = dto.activa ?? true;

    const existe = await this.cajaRepo.findOne({ where: { numero } });
    if (existe) throw new ConflictException(`Ya existe una caja con número "${numero}"`);

    const caja = this.cajaRepo.create({ numero, activa });
    const saved = await this.cajaRepo.save(caja);

    return { idCaja: saved.idCaja, numero: saved.numero, activa: saved.activa };
  }

  async listarCajasFisicas(opts?: { onlyActive?: boolean }) {
    const where = opts?.onlyActive ? { activa: true } : undefined;

    const cajas = await this.cajaRepo.find({
      where,
      order: { idCaja: 'ASC' },
      select: ['idCaja', 'numero', 'activa'],
    });

    return cajas.map((c) => ({
      idCaja: c.idCaja,
      numero: c.numero,
      activa: c.activa,
    }));
  }

  async actualizarCajaFisica(idCaja: number, dto: UpdateCajaDto) {
    const caja = await this.getCajaFisicaByIdOrThrow(idCaja);

    if (dto.numero !== undefined) {
      const numero = this.normalizeNumero(dto.numero);

      const existe = await this.cajaRepo.findOne({ where: { numero } });
      if (existe && existe.idCaja !== caja.idCaja) {
        throw new ConflictException(`Ya existe una caja con número "${numero}"`);
      }

      caja.numero = numero;
    }

    if (dto.activa !== undefined) {
      // Regla pro: no permitir desactivar si tiene sesión abierta
      if (dto.activa === false) {
        const sesionAbierta = await this.sesionRepo.findOne({
          where: { caja: { idCaja: caja.idCaja }, fechaCierre: IsNull() },
        });
        if (sesionAbierta) {
          throw new ConflictException('No puedes desactivar una caja con sesión ABIERTA.');
        }
      }
      caja.activa = dto.activa;
    }

    const saved = await this.cajaRepo.save(caja);
    return { idCaja: saved.idCaja, numero: saved.numero, activa: saved.activa };
  }

  async eliminarCajaFisica(idCaja: number) {
    const caja = await this.getCajaFisicaByIdOrThrow(idCaja);

    const sesiones = await this.sesionRepo.count({ where: { caja: { idCaja } } as any });
    if (sesiones > 0) {
      throw new ConflictException(
        'No se puede eliminar: la caja tiene referencias. Desactívala en su lugar.',
      );
    }

    await this.cajaRepo.remove(caja);
    return { ok: true };
  }

  // =========================
  // VENDEDOR: abrir / actual
  // =========================

  async abrirCaja(userId: string, dto: AbrirCajaDto) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const monto = Number(dto.montoInicial);
    if (!Number.isFinite(monto) || monto < 0) {
      throw new BadRequestException('montoInicial debe ser numérico y >= 0');
    }

    // Si viene cajaId (selección), la usamos; si no, tomamos default (primera activa)
    const cajaFisica =
      dto.cajaId != null
        ? await this.getCajaFisicaByIdOrThrow(Number(dto.cajaId))
        : await this.getCajaFisicaPorDefecto();

    if (!cajaFisica.activa) {
      throw new BadRequestException(`La caja ${cajaFisica.numero} no está activa`);
    }

    // Regla 1: un usuario solo puede tener 1 sesión abierta
    const sesionUsuario = await this.sesionRepo.findOne({
      where: { usuario: { idUsuario: userId }, fechaCierre: IsNull() },
    });
    if (sesionUsuario) {
      throw new ConflictException('Ya tienes una sesión de caja ABIERTA.');
    }

    // Regla 2: una caja física solo puede tener 1 sesión abierta
    const sesionCaja = await this.sesionRepo.findOne({
      where: { caja: { idCaja: cajaFisica.idCaja }, fechaCierre: IsNull() },
    });
    if (sesionCaja) {
      throw new ConflictException(`Ya existe una sesión ABIERTA para ${cajaFisica.numero}.`);
    }

    return this.dataSource.transaction(async (manager) => {
      const sesionRepoTx = manager.getRepository(SesionCajaEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);
      const stockSesionRepoTx = manager.getRepository(StockSesionCajaEntity);
      const productoStockRepoTx = manager.getRepository(ProductoStockEntity);

      const sala = await this.getSalaVentaActivaOrThrow();

      const sesion = sesionRepoTx.create({
        caja: cajaFisica,
        usuario: { idUsuario: userId } as any,
        fechaCierre: null,
        montoInicial: monto.toFixed(2),
        montoFinal: null,
        estado: SesionCajaEstado.ABIERTA,
        totalVentas: '0.00',
        cantidadVentas: 0,
        totalEfectivo: '0.00',
        totalTarjeta: '0.00',
      });

      const sesionGuardada = await sesionRepoTx.save(sesion);

      // snapshot stock inicial por producto
      const productos = await productoRepoTx.find({
        where: { isActive: true },
        select: ['id'],
      });

      if (productos.length > 0) {
        const productoIds = productos.map((p) => p.id);

        const stocks = await productoStockRepoTx.find({
          where: {
            ubicacion: { id: sala.id },
            producto: { id: In(productoIds) } as any,
          } as any,
          relations: { producto: true },
        });

        const stockMap = new Map(
          stocks.map((s) => [s.producto.id, Math.max(0, s.cantidad ?? 0)]),
        );

        const values = productos.map((p) => ({
          sesionCaja: { id: sesionGuardada.id } as any,
          producto: { id: p.id } as any,
          ubicacion: { id: sala.id } as any,
          stockInicial: stockMap.get(p.id) ?? 0,
          stockFinal: null,
        }));

        await stockSesionRepoTx
          .createQueryBuilder()
          .insert()
          .into(StockSesionCajaEntity)
          .values(values)
          .execute();
      }

      return {
        caja: {
          idCaja: cajaFisica.idCaja,
          numero: cajaFisica.numero,
          activa: cajaFisica.activa,
        },
        sesionCaja: {
          idSesionCaja: sesionGuardada.id,
          fechaApertura: sesionGuardada.fechaApertura,
          fechaCierre: sesionGuardada.fechaCierre,
          estado: sesionGuardada.estado,
          montoInicial: sesionGuardada.montoInicial,
          montoFinal: sesionGuardada.montoFinal,
        },
      };
    });
  }

  async cajaActual(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    // Profesional: si el usuario tiene sesión abierta, devolvemos ESA (no “la default”)
    const sesionUsuario = await this.sesionRepo.findOne({
      where: { usuario: { idUsuario: userId }, fechaCierre: IsNull() },
      relations: { caja: true, usuario: true },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesionUsuario) return null;

    return {
      caja: {
        idCaja: sesionUsuario.caja.idCaja,
        numero: sesionUsuario.caja.numero,
        activa: sesionUsuario.caja.activa,
      },
      sesionCaja: {
        idSesionCaja: sesionUsuario.id,
        fechaApertura: sesionUsuario.fechaApertura,
        fechaCierre: sesionUsuario.fechaCierre,
        estado: sesionUsuario.estado,
        montoInicial: sesionUsuario.montoInicial,
        montoFinal: sesionUsuario.montoFinal,
        usuario: {
          idUsuario: (sesionUsuario.usuario as any)?.idUsuario,
          email: (sesionUsuario.usuario as any)?.email,
        },
      },
    };
  }

  async previsualizarResumen(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const sesion = await this.sesionRepo.findOne({
      where: { usuario: { idUsuario: userId }, fechaCierre: IsNull() },
      relations: { usuario: true },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesion) throw new ConflictException('No hay caja abierta (sesión abierta).');

    const resumen = await this.getResumenVentasSesion(sesion.id);
    return this.buildResumenResponse(sesion, resumen);
  }

  async listarSesionesCerradas(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const sesiones = await this.sesionRepo.find({
      where: { usuario: { idUsuario: userId }, estado: SesionCajaEstado.CERRADA } as any,
      relations: { caja: true },
      order: { fechaCierre: 'DESC' },
      take: 200,
    });

    return sesiones.map((s) => ({
      idSesionCaja: s.id,
      estado: s.estado,
      fechaApertura: s.fechaApertura,
      fechaCierre: s.fechaCierre,
      montoInicial: s.montoInicial,
      montoFinal: s.montoFinal,
      totalVentas: s.totalVentas ?? '0.00',
      cantidadVentas: s.cantidadVentas ?? 0,
      totalEfectivo: s.totalEfectivo ?? '0.00',
      totalTarjeta: s.totalTarjeta ?? '0.00',
      caja: s.caja
        ? { idCaja: s.caja.idCaja, numero: s.caja.numero, activa: s.caja.activa }
        : null,
    }));
  }

  async resumenSesion(userId: string, sesionCajaId: number) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');
    if (!Number.isFinite(sesionCajaId) || sesionCajaId <= 0) {
      throw new BadRequestException('sesionCajaId inválido');
    }

    const sesion = await this.sesionRepo.findOne({
      where: { id: sesionCajaId, usuario: { idUsuario: userId } } as any,
      relations: { usuario: true },
    });

    if (!sesion) throw new NotFoundException('Sesión de caja no encontrada');

    const resumen =
      sesion.estado === SesionCajaEstado.CERRADA
        ? {
            totalVentas: sesion.totalVentas ?? '0.00',
            cantidadVentas: sesion.cantidadVentas ?? 0,
            totalEfectivo: sesion.totalEfectivo ?? '0.00',
            totalTarjeta: sesion.totalTarjeta ?? '0.00',
          }
        : await this.getResumenVentasSesion(sesion.id);

    return this.buildResumenResponse(sesion, resumen);
  }

  async cerrarCaja(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const sesion = await this.sesionRepo.findOne({
      where: { usuario: { idUsuario: userId }, fechaCierre: IsNull() },
      relations: { usuario: true },
      order: { fechaApertura: 'DESC' },
    });

    if (!sesion) throw new ConflictException('No hay caja abierta (sesión abierta).');
    if (sesion.estado !== SesionCajaEstado.ABIERTA) {
      throw new ConflictException('La sesión de caja no está abierta.');
    }

    const enEdicion = await this.ventaRepo.count({
      where: {
        sesionCaja: { id: sesion.id } as any,
        estado: VentaEstado.EN_EDICION,
      } as any,
    });

    if (enEdicion > 0) {
      throw new ConflictException('No puedes cerrar caja con ventas en edición.');
    }

    const resumen = await this.getResumenVentasSesion(sesion.id);
    const montoInicial = this.normalizeMoney(sesion.montoInicial);
    const montoFinal = (montoInicial + this.normalizeMoney(resumen.totalEfectivo)).toFixed(2);

    sesion.fechaCierre = new Date();
    sesion.estado = SesionCajaEstado.CERRADA;
    sesion.totalVentas = resumen.totalVentas;
    sesion.cantidadVentas = resumen.cantidadVentas;
    sesion.totalEfectivo = resumen.totalEfectivo;
    sesion.totalTarjeta = resumen.totalTarjeta;
    sesion.montoFinal = montoFinal;

    await this.sesionRepo.save(sesion);

    return this.buildResumenResponse(sesion, resumen);
  }
}
