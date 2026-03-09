import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { FinanzasService } from '../finanzas/finanzas.service';
import { CreatePagoPersonalDto } from './dto/create-pago-personal.dto';
import { CreateTrabajadorDto } from './dto/create-trabajador.dto';
import { ListarPagosDto } from './dto/listar-pagos.dto';
import { ListarTrabajadoresDto } from './dto/listar-trabajadores.dto';
import { UpdatePagoPersonalDto } from './dto/update-pago-personal.dto';
import { UpdateTrabajadorDto } from './dto/update-trabajador.dto';
import { PagoPersonalCambioEntity } from './entities/pago-personal-cambio.entity';
import { PagoPersonalEntity, PagoPersonalEstado } from './entities/pago-personal.entity';
import { DocumentoTipo, TrabajadorEntity, TrabajadorEstado } from './entities/trabajador.entity';

@Injectable()
export class RrhhService {
  private readonly businessTimeZone = 'America/Santiago';

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(TrabajadorEntity)
    private readonly trabajadorRepo: Repository<TrabajadorEntity>,
    @InjectRepository(PagoPersonalEntity)
    private readonly pagoRepo: Repository<PagoPersonalEntity>,
    private readonly finanzasService: FinanzasService,
  ) {}

  private normalizeText(value?: string | null, upper = false) {
    const cleaned = value?.trim() || null;
    if (!cleaned) return null;
    return upper ? cleaned.toUpperCase() : cleaned;
  }

  private normalizeDocumentoNumero(value: string) {
    return value.trim().toUpperCase();
  }

  private normalizeConcepto(value: string) {
    return value.trim().toUpperCase();
  }

  private assertMontoValido(monto: number) {
    if (!Number.isFinite(monto) || monto <= 0) {
      throw new BadRequestException('monto debe ser un numero > 0');
    }
  }

  private toTrabajadorResponse(trabajador: TrabajadorEntity) {
    return {
      id: trabajador.id,
      nombres: trabajador.nombres,
      apellidos: trabajador.apellidos,
      documentoTipo: trabajador.documentoTipo,
      documentoNumero: trabajador.documentoNumero,
      telefono: trabajador.telefono,
      email: trabajador.email,
      cargo: trabajador.cargo,
      observacion: trabajador.observacion,
      estado: trabajador.estado,
      createdAt: trabajador.createdAt,
      updatedAt: trabajador.updatedAt,
      createdByUserId: trabajador.createdByUserId,
      updatedByUserId: trabajador.updatedByUserId,
    };
  }

  private toPagoResponse(pago: PagoPersonalEntity) {
    return {
      id: pago.id,
      trabajador: pago.trabajador
        ? {
            id: pago.trabajador.id,
            nombres: pago.trabajador.nombres,
            apellidos: pago.trabajador.apellidos,
            documentoTipo: pago.trabajador.documentoTipo,
            documentoNumero: pago.trabajador.documentoNumero,
            estado: pago.trabajador.estado,
          }
        : null,
      monto: Number(pago.monto ?? 0),
      moneda: pago.moneda,
      fechaPago: pago.fechaPago,
      concepto: pago.concepto,
      descripcion: pago.descripcion,
      metodoPago: pago.metodoPago,
      referencia: pago.referencia,
      adjuntoUrl: pago.adjuntoUrl,
      estado: pago.estado,
      createdAt: pago.createdAt,
      updatedAt: pago.updatedAt,
      createdByUserId: pago.createdByUserId,
      updatedByUserId: pago.updatedByUserId,
    };
  }

  private async assertDocumentoDisponible(
    documentoTipo: DocumentoTipo,
    documentoNumero: string,
    exceptId?: string,
  ) {
    const qb = this.trabajadorRepo
      .createQueryBuilder('trab')
      .where('trab.documento_tipo = :documentoTipo', { documentoTipo })
      .andWhere('trab.documento_numero = :documentoNumero', { documentoNumero });

    if (exceptId) {
      qb.andWhere('trab.id <> :exceptId', { exceptId });
    }

    const exists = await qb.getOne();
    if (exists) {
      throw new BadRequestException('Ya existe un trabajador con ese documento');
    }
  }

  async crearTrabajador(dto: CreateTrabajadorDto, userId: string) {
    const documentoNumero = this.normalizeDocumentoNumero(dto.documentoNumero);
    await this.assertDocumentoDisponible(dto.documentoTipo, documentoNumero);

    const trabajador = this.trabajadorRepo.create({
      nombres: dto.nombres.trim(),
      apellidos: dto.apellidos.trim(),
      documentoTipo: dto.documentoTipo,
      documentoNumero,
      telefono: this.normalizeText(dto.telefono),
      email: this.normalizeText(dto.email?.toLowerCase()),
      cargo: this.normalizeText(dto.cargo),
      observacion: this.normalizeText(dto.observacion),
      estado: TrabajadorEstado.ACTIVO,
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    const saved = await this.trabajadorRepo.save(trabajador);
    return this.toTrabajadorResponse(saved);
  }

  async listarTrabajadores(dto: ListarTrabajadoresDto) {
    const qb = this.trabajadorRepo
      .createQueryBuilder('trab')
      .orderBy('trab.created_at', 'DESC');

    if (dto.estado) {
      qb.andWhere('trab.estado = :estado', { estado: dto.estado });
    }

    if (dto.q?.trim()) {
      const term = `%${dto.q.trim()}%`;
      qb.andWhere(
        '(trab.nombres ILIKE :term OR trab.apellidos ILIKE :term OR trab.documento_numero ILIKE :term OR trab.cargo ILIKE :term)',
        { term },
      );
    }

    const items = await qb.getMany();
    return items.map((it) => this.toTrabajadorResponse(it));
  }

  async actualizarTrabajador(id: string, dto: UpdateTrabajadorDto, userId: string) {
    const trabajador = await this.trabajadorRepo.findOne({ where: { id } });
    if (!trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    const nextDocumentoTipo = dto.documentoTipo ?? trabajador.documentoTipo;
    const nextDocumentoNumero = this.normalizeDocumentoNumero(
      dto.documentoNumero ?? trabajador.documentoNumero,
    );

    if (
      nextDocumentoTipo !== trabajador.documentoTipo ||
      nextDocumentoNumero !== trabajador.documentoNumero
    ) {
      await this.assertDocumentoDisponible(nextDocumentoTipo, nextDocumentoNumero, trabajador.id);
      trabajador.documentoTipo = nextDocumentoTipo;
      trabajador.documentoNumero = nextDocumentoNumero;
    }

    if (dto.nombres !== undefined) trabajador.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) trabajador.apellidos = dto.apellidos.trim();
    if (dto.telefono !== undefined) trabajador.telefono = this.normalizeText(dto.telefono);
    if (dto.email !== undefined) trabajador.email = this.normalizeText(dto.email?.toLowerCase());
    if (dto.cargo !== undefined) trabajador.cargo = this.normalizeText(dto.cargo);
    if (dto.observacion !== undefined) trabajador.observacion = this.normalizeText(dto.observacion);
    trabajador.updatedByUserId = userId;

    const saved = await this.trabajadorRepo.save(trabajador);
    return this.toTrabajadorResponse(saved);
  }

  async setEstadoTrabajador(id: string, estado: TrabajadorEstado, userId: string) {
    const trabajador = await this.trabajadorRepo.findOne({ where: { id } });
    if (!trabajador) {
      throw new NotFoundException('Trabajador no encontrado');
    }

    trabajador.estado = estado;
    trabajador.updatedByUserId = userId;
    const saved = await this.trabajadorRepo.save(trabajador);
    return this.toTrabajadorResponse(saved);
  }

  private applyPagosDateFilter(
    qb: SelectQueryBuilder<PagoPersonalEntity>,
    alias: string,
    from?: string,
    to?: string,
  ) {
    if ((from && !to) || (!from && to)) {
      throw new BadRequestException('Debes enviar from y to juntos');
    }

    if (from && to) {
      const fromDate = from.slice(0, 10);
      const toDate = to.slice(0, 10);
      if (fromDate > toDate) {
        throw new BadRequestException('from no puede ser mayor a to');
      }

      qb.andWhere(`DATE(${alias}.fecha_pago AT TIME ZONE :tz) BETWEEN :fromDate AND :toDate`, {
        tz: this.businessTimeZone,
        fromDate,
        toDate,
      });
    }
  }

  async crearPago(dto: CreatePagoPersonalDto, userId: string) {
    this.assertMontoValido(dto.monto);

    const createdPagoId = await this.dataSource.transaction(async (manager) => {
      const trabajadorRepoTx = manager.getRepository(TrabajadorEntity);
      const pagoRepoTx = manager.getRepository(PagoPersonalEntity);

      const trabajador = await trabajadorRepoTx.findOne({ where: { id: dto.trabajadorId } });
      if (!trabajador) {
        throw new NotFoundException('Trabajador no encontrado');
      }

      if (trabajador.estado !== TrabajadorEstado.ACTIVO) {
        throw new BadRequestException('Solo trabajadores activos pueden recibir nuevos pagos');
      }

      const pago = pagoRepoTx.create({
        trabajador,
        monto: dto.monto.toFixed(2),
        moneda: 'CLP',
        fechaPago: dto.fechaPago ? new Date(dto.fechaPago) : new Date(),
        concepto: this.normalizeConcepto(dto.concepto),
        descripcion: this.normalizeText(dto.descripcion),
        metodoPago: dto.metodoPago ?? null,
        referencia: this.normalizeText(dto.referencia),
        adjuntoUrl: this.normalizeText(dto.adjuntoUrl),
        estado: PagoPersonalEstado.ACTIVO,
        createdByUserId: userId,
        updatedByUserId: userId,
      });

      const savedPago = await pagoRepoTx.save(pago);

      await this.finanzasService.upsertEgresoRrhhPago(
        {
          pagoId: savedPago.id,
          monto: Number(savedPago.monto),
          fechaPago: savedPago.fechaPago,
          concepto: savedPago.concepto,
          descripcion: savedPago.descripcion,
          metodoPago: savedPago.metodoPago,
          referencia: savedPago.referencia,
          trabajadorId: trabajador.id,
          trabajadorNombre: `${trabajador.nombres} ${trabajador.apellidos}`.trim(),
        },
        manager,
      );

      return savedPago.id;
    });

    const pago = await this.pagoRepo.findOne({
      where: { id: createdPagoId },
      relations: { trabajador: true },
    });
    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.toPagoResponse(pago);
  }

  async listarPagos(dto: ListarPagosDto) {
    const qb = this.pagoRepo
      .createQueryBuilder('pago')
      .leftJoinAndSelect('pago.trabajador', 'trabajador')
      .where('pago.estado = :estado', { estado: PagoPersonalEstado.ACTIVO })
      .orderBy('pago.fecha_pago', 'DESC')
      .addOrderBy('pago.created_at', 'DESC');

    this.applyPagosDateFilter(qb, 'pago', dto.from, dto.to);

    if (dto.trabajadorId) {
      qb.andWhere('trabajador.id = :trabajadorId', { trabajadorId: dto.trabajadorId });
    }

    if (dto.concepto?.trim()) {
      qb.andWhere('pago.concepto = :concepto', {
        concepto: this.normalizeConcepto(dto.concepto),
      });
    }

    const items = await qb.getMany();
    return items.map((it) => this.toPagoResponse(it));
  }

  async actualizarPago(id: string, dto: UpdatePagoPersonalDto, userId: string) {
    const updatedPagoId = await this.dataSource.transaction(async (manager) => {
      const pagoRepoTx = manager.getRepository(PagoPersonalEntity);
      const pagoCambioRepoTx = manager.getRepository(PagoPersonalCambioEntity);

      const pago = await pagoRepoTx.findOne({
        where: { id },
        relations: { trabajador: true },
      });

      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pago.estado !== PagoPersonalEstado.ACTIVO) {
        throw new BadRequestException('Solo se pueden editar pagos activos');
      }

      const before = this.toPagoResponse(pago);

      if (dto.monto !== undefined) {
        this.assertMontoValido(dto.monto);
        pago.monto = dto.monto.toFixed(2);
      }

      if (dto.fechaPago !== undefined) {
        pago.fechaPago = new Date(dto.fechaPago);
      }

      if (dto.concepto !== undefined) {
        pago.concepto = this.normalizeConcepto(dto.concepto);
      }

      if (dto.descripcion !== undefined) {
        pago.descripcion = this.normalizeText(dto.descripcion);
      }

      if (dto.metodoPago !== undefined) {
        pago.metodoPago = dto.metodoPago;
      }

      if (dto.referencia !== undefined) {
        pago.referencia = this.normalizeText(dto.referencia);
      }

      if (dto.adjuntoUrl !== undefined) {
        pago.adjuntoUrl = this.normalizeText(dto.adjuntoUrl);
      }

      const afterPreview = this.toPagoResponse(pago);
      const changed = JSON.stringify(before) !== JSON.stringify(afterPreview);
      if (!changed) {
        throw new BadRequestException('No se enviaron cambios para actualizar');
      }

      pago.updatedByUserId = userId;
      const saved = await pagoRepoTx.save(pago);

      await pagoCambioRepoTx.save(
        pagoCambioRepoTx.create({
          pago: { id: saved.id } as PagoPersonalEntity,
          motivo: dto.motivo.trim(),
          antes: before,
          despues: afterPreview,
          changedByUserId: userId,
        }),
      );

      await this.finanzasService.upsertEgresoRrhhPago(
        {
          pagoId: saved.id,
          monto: Number(saved.monto),
          fechaPago: saved.fechaPago,
          concepto: saved.concepto,
          descripcion: saved.descripcion,
          metodoPago: saved.metodoPago,
          referencia: saved.referencia,
          trabajadorId: pago.trabajador.id,
          trabajadorNombre: `${pago.trabajador.nombres} ${pago.trabajador.apellidos}`.trim(),
        },
        manager,
      );

      return saved.id;
    });

    const pago = await this.pagoRepo.findOne({
      where: { id: updatedPagoId },
      relations: { trabajador: true },
    });
    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.toPagoResponse(pago);
  }

  async anularPago(id: string, userId: string, motivo?: string) {
    const updatedPagoId = await this.dataSource.transaction(async (manager) => {
      const pagoRepoTx = manager.getRepository(PagoPersonalEntity);
      const pagoCambioRepoTx = manager.getRepository(PagoPersonalCambioEntity);

      const pago = await pagoRepoTx.findOne({
        where: { id },
        relations: { trabajador: true },
      });

      if (!pago) {
        throw new NotFoundException('Pago no encontrado');
      }

      if (pago.estado !== PagoPersonalEstado.ACTIVO) {
        throw new BadRequestException('Solo se pueden anular pagos activos');
      }

      const before = this.toPagoResponse(pago);

      pago.estado = PagoPersonalEstado.ANULADO;
      pago.updatedByUserId = userId;

      const saved = await pagoRepoTx.save(pago);
      const after = this.toPagoResponse(saved);
      const motivoCambio = this.normalizeText(motivo) ?? 'ANULACION';

      await pagoCambioRepoTx.save(
        pagoCambioRepoTx.create({
          pago: { id: saved.id } as PagoPersonalEntity,
          motivo: motivoCambio,
          antes: before,
          despues: after,
          changedByUserId: userId,
        }),
      );

      await this.finanzasService.anularMovimientoRrhhPago(saved.id, userId, motivoCambio, manager);

      return saved.id;
    });

    const pago = await this.pagoRepo.findOne({
      where: { id: updatedPagoId },
      relations: { trabajador: true },
    });
    if (!pago) {
      throw new NotFoundException('Pago no encontrado');
    }

    return this.toPagoResponse(pago);
  }
}
