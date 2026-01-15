import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, DataSource } from 'typeorm';
import { CajaEntity, CajaEstado } from './entities/caja.entity';
import { HistorialEntity } from '../historial/entities/historial.entity';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { HistorialStockVentaEntity } from '../historial/entities/historial-stock-venta.entity';

@Injectable()
export class CajaService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(CajaEntity) private readonly cajaRepo: Repository<CajaEntity>,
    @InjectRepository(HistorialEntity) private readonly historialRepo: Repository<HistorialEntity>,
    @InjectRepository(ProductoEntity) private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(HistorialStockVentaEntity) private readonly hsvRepo: Repository<HistorialStockVentaEntity>,
  ) {}

  async abrirCaja(userId: string, dto: AbrirCajaDto) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const monto = Number(dto.montoInicial);
    if (!Number.isFinite(monto) || monto < 0) {
      throw new BadRequestException('montoInicial debe ser numérico y >= 0');
    }

    const historialAbierto = await this.historialRepo.findOne({
      where: { usuario: { id: userId }, fechaCierre: IsNull() },
      relations: { caja: true },
    });

    if (historialAbierto) {
      throw new ConflictException('Ya existe una caja/jornada abierta para este usuario.');
    }

    return this.dataSource.transaction(async (manager) => {
      const historialRepoTx = manager.getRepository(HistorialEntity);
      const cajaRepoTx = manager.getRepository(CajaEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);
      const hsvRepoTx = manager.getRepository(HistorialStockVentaEntity);

      const historial = historialRepoTx.create({
        usuario: { id: userId } as any,
        fechaCierre: null,
      });

      const historialGuardado = await historialRepoTx.save(historial);

      const caja = cajaRepoTx.create({
        historial: historialGuardado,
        montoInicial: monto.toFixed(2),
        montoFinal: null,
        estado: CajaEstado.ABIERTA,
      });

      const cajaGuardada = await cajaRepoTx.save(caja);

      // 3) Inicializar stock teórico de sala por producto (snapshots)
      //    Regla: NO obliga a contar. Toma Producto.stockSalaVenta.
      const productos = await productoRepoTx.find({
        where: { isActive: true }, 
        select: ['id', 'stockSalaVenta'],
      });

      if (productos.length > 0) {
        const values = productos.map((p) => ({
          historial: { idHistorial: historialGuardado.idHistorial } as any,
          producto: { id: p.id } as any,
          stockInicial: Math.max(0, p.stockSalaVenta ?? 0),
          stockFinal: null,
        }));

        //Insert masivo: mucho más rápido que save(array) con N filas
        await hsvRepoTx
          .createQueryBuilder()
          .insert()
          .into(HistorialStockVentaEntity)
          .values(values)
          .execute();
      }

      // Respuesta igual a la tuya (solo que ahora garantiza HSV inicializado)
      return {
        idCaja: cajaGuardada.idCaja,
        estado: cajaGuardada.estado,
        montoInicial: cajaGuardada.montoInicial,
        montoFinal: cajaGuardada.montoFinal,
        montoTotal: cajaGuardada.montoInicial,
        historial: {
          idHistorial: historialGuardado.idHistorial,
          fechaApertura: historialGuardado.fechaApertura,
          fechaCierre: historialGuardado.fechaCierre,
        },
      };
    });
  }

  async cajaActual(userId: string) {
    if (!userId) throw new BadRequestException('Token inválido: no viene id/sub');

    const historialAbierto = await this.historialRepo.findOne({
      where: { usuario: { id: userId }, fechaCierre: IsNull() },
      relations: { caja: true },
    });

    if (!historialAbierto?.caja) return null;

    const caja = historialAbierto.caja;

    return {
      idCaja: caja.idCaja,
      estado: caja.estado,
      montoInicial: caja.montoInicial,
      montoFinal: caja.montoFinal,
      montoTotal: caja.montoInicial,
      historial: {
        idHistorial: historialAbierto.idHistorial,
        fechaApertura: historialAbierto.fechaApertura,
        fechaCierre: historialAbierto.fechaCierre,
      },
    };
  }
}
