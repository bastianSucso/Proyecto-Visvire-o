import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { CajaEntity, CajaEstado } from './entities/caja.entity';
import { HistorialEntity } from '../historial/entities/historial.entity';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class CajaService {
  constructor(
    @InjectRepository(CajaEntity) private readonly cajaRepo: Repository<CajaEntity>,
    @InjectRepository(HistorialEntity) private readonly historialRepo: Repository<HistorialEntity>,
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

    const historial = this.historialRepo.create({
      usuario: { id: userId } as any, // 👈 no necesitas la entidad completa
      fechaCierre: null,
      cantidadInicialProducto: null,
      cantidadFinalProducto: null,
    });

    const historialGuardado = await this.historialRepo.save(historial);

    const caja = this.cajaRepo.create({
      historial: historialGuardado,
      montoInicial: monto.toFixed(2),
      montoFinal: null,
      estado: CajaEstado.ABIERTA,
    });

    const cajaGuardada = await this.cajaRepo.save(caja);

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
