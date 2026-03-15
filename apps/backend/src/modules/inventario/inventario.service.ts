import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { AlteraEntity } from './entities/altera.entity';
import { ProductoEntity, ProductoTipoEnum } from '../productos/entities/producto.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { UserEntity } from '../users/entities/user.entity';
import { RecetasService } from '../productos/recetas.service';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { CreateAjusteDto } from './dto/create-ajuste.dto';
import { CreateAjusteOperativoDto } from './dto/create-ajuste-operativo.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { CreateDocumentoIngresoDto } from './dto/create-documento-ingreso.dto';
import { CreateDocumentoTraspasoDto } from './dto/create-documento-traspaso.dto';
import { ConvertirProductoDto } from './dto/convertir-producto.dto';
import { CreateConversionFactorDto } from './dto/create-conversion-factor.dto';
import { ProductoConversionEntity } from './entities/producto-conversion.entity';
import { FinanzasService } from '../finanzas/finanzas.service';
import { InventarioSalaObjetivoEntity } from './entities/inventario-sala-objetivo.entity';
import { CreateInventarioSalaObjetivoDto } from './dto/create-inventario-sala-objetivo.dto';
import { UpdateInventarioSalaObjetivoDto } from './dto/update-inventario-sala-objetivo.dto';
import { InventarioProductoImportanteEntity } from './entities/inventario-producto-importante.entity';
import { InventarioHojaCompraItemEntity } from './entities/inventario-hoja-compra-item.entity';
import { AddInventarioHojaCompraItemDto } from './dto/add-inventario-hoja-compra-item.dto';
import { UpdateInventarioHojaCompraItemDto } from './dto/update-inventario-hoja-compra-item.dto';
import { CreateInventarioProductoImportanteDto } from './dto/create-inventario-producto-importante.dto';
import { UpdateInventarioProductoImportanteDto } from './dto/update-inventario-producto-importante.dto';
import {
  AJUSTE_OPERATIVO_CAUSAS,
  AJUSTE_OPERATIVO_CAUSAS_LABEL,
  AjusteOperativoCausa,
} from './constants/ajuste-operativo-causas';

const IVA_TASA = 0.19;

@Injectable()
export class InventarioService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AlteraEntity)
    private readonly alteraRepo: Repository<AlteraEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,
    @InjectRepository(ProductoStockEntity)
    private readonly stockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(ProductoConversionEntity)
    private readonly conversionRepo: Repository<ProductoConversionEntity>,
    @InjectRepository(InventarioSalaObjetivoEntity)
    private readonly salaObjetivoRepo: Repository<InventarioSalaObjetivoEntity>,
    @InjectRepository(InventarioProductoImportanteEntity)
    private readonly productoImportanteRepo: Repository<InventarioProductoImportanteEntity>,
    @InjectRepository(InventarioHojaCompraItemEntity)
    private readonly hojaCompraItemRepo: Repository<InventarioHojaCompraItemEntity>,
    private readonly recetasService: RecetasService,
    private readonly finanzasService: FinanzasService,
  ) {}

  private async getProductoOrThrow(productoId: string) {
    const producto = await this.productoRepo.findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  private assertProductoOperable(producto: ProductoEntity, operacion: string) {
    if (!producto.isActive) {
      throw new BadRequestException(`No se puede ${operacion} un producto inactivo`);
    }
    if (producto.tipo === ProductoTipoEnum.COMIDA) {
      throw new BadRequestException('No se permite ingresar o traspasar productos COMIDA');
    }
  }

  private async getProductoOperableOrThrow(productoId: string, operacion: string) {
    const producto = await this.getProductoOrThrow(productoId);
    this.assertProductoOperable(producto, operacion);
    return producto;
  }

  private async getUbicacionOrThrow(ubicacionId: string) {
    const ubicacion = await this.ubicacionRepo.findOne({ where: { id: ubicacionId } });
    if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');
    return ubicacion;
  }

  private async getSalaActivaOrThrow() {
    const sala = await this.ubicacionRepo.findOne({
      where: { tipo: 'SALA_VENTA', activa: true } as any,
      order: { createdAt: 'ASC' },
    });
    if (!sala) {
      throw new NotFoundException('No existe sala de ventas activa');
    }
    return sala;
  }

  private parseStockIdeal(raw: number) {
    const stockIdeal = Number(raw);
    if (!Number.isFinite(stockIdeal) || stockIdeal <= 0) {
      throw new BadRequestException('stockIdeal debe ser un número > 0');
    }
    return stockIdeal;
  }

  private toSalaObjetivoResponse(
    objetivo: InventarioSalaObjetivoEntity,
    stockTeoricoSala: number,
  ) {
    const stockIdeal = Number(objetivo.stockIdeal ?? 0);
    const faltante = Math.max(stockIdeal - stockTeoricoSala, 0);

    return {
      id: objetivo.id,
      stockIdeal,
      stockTeoricoSala,
      faltante,
      producto: {
        id: objetivo.producto.id,
        name: objetivo.producto.name,
        internalCode: objetivo.producto.internalCode,
        barcode: objetivo.producto.barcode ?? null,
        unidadBase: objetivo.producto.unidadBase ?? null,
        tipo: objetivo.producto.tipo,
        isActive: objetivo.producto.isActive,
      },
      createdAt: objetivo.createdAt,
      updatedAt: objetivo.updatedAt,
    };
  }

  private parseCantidadMinima(raw: number) {
    const cantidadMinima = Number(raw);
    if (!Number.isFinite(cantidadMinima) || cantidadMinima <= 0) {
      throw new BadRequestException('cantidadMinima debe ser un número > 0');
    }
    return cantidadMinima;
  }

  private toProductoImportanteResponse(
    item: InventarioProductoImportanteEntity,
    stockTotal: number,
    enHojaCompra: boolean,
  ) {
    const cantidadMinima = Number(item.cantidadMinima ?? 0);
    const faltante = Math.max(cantidadMinima - stockTotal, 0);

    return {
      id: item.id,
      cantidadMinima,
      stockTotal,
      faltante,
      enHojaCompra,
      producto: {
        id: item.producto.id,
        name: item.producto.name,
        internalCode: item.producto.internalCode,
        barcode: item.producto.barcode ?? null,
        unidadBase: item.producto.unidadBase ?? null,
        tipo: item.producto.tipo,
        isActive: item.producto.isActive,
        precioCosto: Number(item.producto.precioCosto ?? 0),
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private toHojaCompraItemResponse(item: InventarioHojaCompraItemEntity, stockTotal: number) {
    const cantidad = Number(item.cantidad ?? 0);
    const precioCostoUnitario = Number(item.producto.precioCosto ?? 0);
    const subtotalEstimado = Number((cantidad * precioCostoUnitario).toFixed(2));

    return {
      id: item.id,
      cantidad,
      precioCostoUnitario,
      subtotalEstimado,
      stockTotal,
      producto: {
        id: item.producto.id,
        name: item.producto.name,
        internalCode: item.producto.internalCode,
        barcode: item.producto.barcode ?? null,
        unidadBase: item.producto.unidadBase ?? null,
        tipo: item.producto.tipo,
        isActive: item.producto.isActive,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private async syncHojaCompraFromFaltante(productoId: string, faltante: number) {
    const existing = await this.hojaCompraItemRepo.findOne({
      where: { producto: { id: productoId } } as any,
    });

    if (faltante <= 0) {
      if (existing) {
        await this.hojaCompraItemRepo.remove(existing);
      }
      return;
    }

    const cantidad = this.formatCantidad(faltante);

    if (existing) {
      existing.cantidad = cantidad;
      await this.hojaCompraItemRepo.save(existing);
      return;
    }

    await this.hojaCompraItemRepo.save(
      this.hojaCompraItemRepo.create({
        producto: { id: productoId } as any,
        cantidad,
      }),
    );
  }

  private parseCantidad(raw: number) {
    const cantidad = Number(raw);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }
    return cantidad;
  }

  private parseCosto(raw: number) {
    const costo = Number(raw);
    if (!Number.isFinite(costo) || costo <= 0) {
      throw new BadRequestException('costoIngreso debe ser un número > 0');
    }
    return costo;
  }

  private parseAplicaCreditoFiscal(raw: boolean) {
    if (typeof raw !== 'boolean') {
      throw new BadRequestException('aplicaCreditoFiscal debe ser boolean');
    }
    return raw;
  }

  private formatMonto(value: number) {
    return value.toFixed(2);
  }

  private calcularDatosTributarios(costoIngresoUnitarioTotal: number) {
    const neto = Number((costoIngresoUnitarioTotal / (1 + IVA_TASA)).toFixed(2));
    const iva = Number((costoIngresoUnitarioTotal - neto).toFixed(2));

    return {
      ivaTasa: this.formatMonto(IVA_TASA),
      netoUnitario: this.formatMonto(neto),
      ivaUnitario: this.formatMonto(iva),
    };
  }

  private formatCantidad(value: number) {
    return value.toFixed(3);
  }

  private async getStockTotalByProductoId(
    productoId: string,
    stockRepo: Repository<ProductoStockEntity>,
  ) {
    const row = await stockRepo
      .createQueryBuilder('ps')
      .select('COALESCE(SUM(ps.cantidad), 0)', 'total')
      .where('ps.producto = :productoId', { productoId })
      .getRawOne<{ total: string }>();

    return Number(row?.total ?? 0);
  }

  private async getStockTotalByProductoIds(productoIds: string[]) {
    if (productoIds.length === 0) return new Map<string, number>();

    const rows = await this.stockRepo
      .createQueryBuilder('ps')
      .select('ps.id_producto', 'productoId')
      .addSelect('COALESCE(SUM(ps.cantidad), 0)', 'cantidad')
      .where('ps.id_producto IN (:...productoIds)', { productoIds })
      .groupBy('ps.id_producto')
      .getRawMany<{ productoId: string; cantidad: string }>();

    const map = new Map<string, number>();
    for (const row of rows) {
      map.set(row.productoId, Number(row.cantidad ?? 0));
    }
    return map;
  }

  private getUnidadBaseMeta(producto: ProductoEntity) {
    if (!producto.unidadBase) {
      return { unidad: null, factorABase: null };
    }
    return { unidad: producto.unidadBase, factorABase: '1' };
  }

  private resolveDestinoFromMov(mov: AlteraEntity) {
    if (mov.destino) return mov.destino;
    if (mov.tipo === 'INGRESO' && mov.ubicacion) return mov.ubicacion;
    return null;
  }

  private toDocumentoResponse(documentoRef: string, items: AlteraEntity[]) {
    const first = items[0];
    const fecha = items.reduce((max, it) => (it.fecha > max ? it.fecha : max), first.fecha);
    const origen = first.origen
      ? { id: first.origen.id, nombre: first.origen.nombre, tipo: first.origen.tipo }
      : null;
    const destinoEntity = this.resolveDestinoFromMov(first);
    const destino = destinoEntity
      ? { id: destinoEntity.id, nombre: destinoEntity.nombre, tipo: destinoEntity.tipo }
      : null;
    const usuario = first.usuario ? { id: first.usuario.idUsuario, email: first.usuario.email } : null;

    return {
      documentoRef,
      tipo: first.tipo,
      origen,
      destino,
      usuario,
      fecha,
      items: items.map((it) => ({
        id: it.id,
        cantidad: Number(it.cantidad ?? 0),
        costoIngresoUnitarioTotal:
          it.costoIngresoUnitarioTotal !== null ? Number(it.costoIngresoUnitarioTotal) : null,
        aplicaCreditoFiscal: it.aplicaCreditoFiscal,
        ivaTasa: it.ivaTasa !== null ? Number(it.ivaTasa) : null,
        netoUnitario: it.netoUnitario !== null ? Number(it.netoUnitario) : null,
        ivaUnitario: it.ivaUnitario !== null ? Number(it.ivaUnitario) : null,
        unidadBase: it.producto?.unidadBase ?? null,
        barcode: it.producto?.barcode ?? null,
        producto: it.producto
          ? {
              id: it.producto.id,
              name: it.producto.name,
              internalCode: it.producto.internalCode,
              barcode: it.producto.barcode ?? null,
              tipo: it.producto.tipo,
            }
          : null,
      })),
    };
  }

  async crearDocumentoIngreso(dto: CreateDocumentoIngresoDto, usuarioId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento no tiene items');
    }

    const destino = await this.getUbicacionOrThrow(dto.destinoId);
    const documentoRef = randomUUID();

    const insumosRecalc: string[] = [];

    await this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);

      for (const it of dto.items) {
        const producto = await this.getProductoOperableOrThrow(it.productoId, 'ingresar stock de');
        const cantidad = this.parseCantidad(it.cantidad);
        const costoIngreso = this.parseCosto(it.costoIngreso);
        const aplicaCreditoFiscal = this.parseAplicaCreditoFiscal(it.aplicaCreditoFiscal);
        const datosTributarios = this.calcularDatosTributarios(costoIngreso);

        const stockTotal = await this.getStockTotalByProductoId(producto.id, stockRepoTx);
        const costoActual = Number(producto.precioCosto ?? 0);
        if (!Number.isFinite(costoActual)) {
          throw new BadRequestException('precioCosto del producto no es válido');
        }

        const nuevoCostoProm =
          (stockTotal * costoActual + cantidad * costoIngreso) / (stockTotal + cantidad);
        const nuevoCostoFixed = nuevoCostoProm.toFixed(2);
        const costoChanged = Number(nuevoCostoFixed) !== costoActual;

        const stockRow = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: destino.id },
          } as any,
        });

        if (stockRow) {
          const actual = Number(stockRow.cantidad ?? 0);
          stockRow.cantidad = this.formatCantidad(actual + cantidad);
          await stockRepoTx.save(stockRow);
        } else {
          await stockRepoTx.save(
            stockRepoTx.create({
              producto: { id: producto.id } as any,
              ubicacion: { id: destino.id } as any,
              cantidad: this.formatCantidad(cantidad),
            }),
          );
        }

        if (
          producto.tipo === ProductoTipoEnum.INSUMO ||
          producto.tipo === ProductoTipoEnum.REVENTA
        ) {
          producto.precioCosto = nuevoCostoFixed;
          await productoRepoTx.save(producto);
          if (producto.tipo === ProductoTipoEnum.INSUMO && costoChanged) {
            insumosRecalc.push(producto.id);
          }
        }

        const unidadMeta = this.getUnidadBaseMeta(producto);
        const movimientoIngreso = await alteraRepoTx.save(
          alteraRepoTx.create({
            tipo: 'INGRESO',
            cantidad: this.formatCantidad(cantidad),
            unidad: unidadMeta.unidad,
            factorABase: unidadMeta.factorABase,
            motivo: null,
            costoIngresoUnitarioTotal: this.formatMonto(costoIngreso),
            aplicaCreditoFiscal,
            ivaTasa: datosTributarios.ivaTasa,
            netoUnitario: datosTributarios.netoUnitario,
            ivaUnitario: datosTributarios.ivaUnitario,
            producto: { id: producto.id } as any,
            ubicacion: { id: destino.id } as any,
            origen: null,
            destino: null,
            usuario: { idUsuario: usuarioId } as UserEntity,
            documentoRef,
          }),
        );

        await this.finanzasService.registrarEgresoInventarioIngreso(
          {
            movimientoAlteraId: movimientoIngreso.id,
            cantidad,
            costoIngresoUnitarioTotal: costoIngreso,
            fecha: movimientoIngreso.fecha,
            aplicaCreditoFiscal,
            documentoRef,
            productoId: producto.id,
            productoNombre: producto.name,
          },
          manager,
        );
      }
    });

    if (insumosRecalc.length > 0) {
      const unique = Array.from(new Set(insumosRecalc));
      await Promise.all(unique.map((id) => this.recetasService.recalculateCostosByInsumo(id)));
    }

    return this.obtenerDocumento(documentoRef);
  }

  async crearDocumentoTraspaso(dto: CreateDocumentoTraspasoDto, usuarioId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento no tiene items');
    }

    if (dto.origenId === dto.destinoId) {
      throw new BadRequestException('origen y destino no pueden ser iguales');
    }

    const origen = await this.getUbicacionOrThrow(dto.origenId);
    const destino = await this.getUbicacionOrThrow(dto.destinoId);
    const documentoRef = randomUUID();

    await this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);

      for (const it of dto.items) {
        const cantidad = this.parseCantidad(it.cantidad);
        const producto = await this.getProductoOperableOrThrow(it.productoId, 'traspasar stock de');

        const stockOrigen = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: origen.id },
          } as any,
        });

        const origenActual = Number(stockOrigen?.cantidad ?? 0);
        if (origenActual < cantidad) {
          throw new BadRequestException('Stock insuficiente en ubicación origen');
        }

        stockOrigen!.cantidad = this.formatCantidad(origenActual - cantidad);
        await stockRepoTx.save(stockOrigen!);

        const stockDestino = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: destino.id },
          } as any,
        });

        if (stockDestino) {
          const actual = Number(stockDestino.cantidad ?? 0);
          stockDestino.cantidad = this.formatCantidad(actual + cantidad);
          await stockRepoTx.save(stockDestino);
        } else {
          await stockRepoTx.save(
            stockRepoTx.create({
              producto: { id: producto.id } as any,
              ubicacion: { id: destino.id } as any,
              cantidad: this.formatCantidad(cantidad),
            }),
          );
        }

        const unidadMeta = this.getUnidadBaseMeta(producto);
        await alteraRepoTx.save(
          alteraRepoTx.create({
            tipo: 'TRASPASO',
            cantidad: this.formatCantidad(cantidad),
            unidad: unidadMeta.unidad,
            factorABase: unidadMeta.factorABase,
            motivo: null,
            costoIngresoUnitarioTotal: null,
            aplicaCreditoFiscal: null,
            ivaTasa: null,
            netoUnitario: null,
            ivaUnitario: null,
            producto: { id: producto.id } as any,
            ubicacion: null,
            origen: { id: origen.id } as any,
            destino: { id: destino.id } as any,
            usuario: { idUsuario: usuarioId } as UserEntity,
            documentoRef,
          }),
        );
      }
    });

    return this.obtenerDocumento(documentoRef);
  }

  async obtenerDocumento(documentoRef: string) {
    const items = await this.alteraRepo.find({
      where: { documentoRef } as any,
      relations: { producto: true, ubicacion: true, origen: true, destino: true, usuario: true },
      order: { fecha: 'ASC' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('Documento no encontrado');
    }

    return this.toDocumentoResponse(documentoRef, items);
  }

  async registrarIngreso(dto: CreateIngresoDto, usuarioId: string) {
    const cantidad = Number(dto.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }
    const costoIngreso = this.parseCosto(dto.costoIngreso);
    const aplicaCreditoFiscal = this.parseAplicaCreditoFiscal(dto.aplicaCreditoFiscal);
    const datosTributarios = this.calcularDatosTributarios(costoIngreso);

    let insumoRecalcId: string | null = null;

    const mov = await this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);

      const producto = await this.getProductoOperableOrThrow(
        dto.productoId,
        'ingresar stock de',
      );
      const ubicacion = await this.getUbicacionOrThrow(dto.ubicacionId);

      const stockTotal = await this.getStockTotalByProductoId(producto.id, stockRepoTx);
      const costoActual = Number(producto.precioCosto ?? 0);
      if (!Number.isFinite(costoActual)) {
        throw new BadRequestException('precioCosto del producto no es válido');
      }

      const nuevoCostoProm =
        (stockTotal * costoActual + cantidad * costoIngreso) / (stockTotal + cantidad);
      const nuevoCostoFixed = nuevoCostoProm.toFixed(2);
      const costoChanged = Number(nuevoCostoFixed) !== costoActual;

      const stockRow = await stockRepoTx.findOne({
        where: {
          producto: { id: producto.id },
          ubicacion: { id: ubicacion.id },
        } as any,
        relations: { producto: true, ubicacion: true },
      });

      const cantidadActual = Number(stockRow?.cantidad ?? 0);
      const nuevaCantidad = cantidadActual + cantidad;

      if (stockRow) {
        stockRow.cantidad = this.formatCantidad(nuevaCantidad);
        await stockRepoTx.save(stockRow);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto,
            ubicacion,
            cantidad: this.formatCantidad(nuevaCantidad),
          }),
        );
      }

      if (
        producto.tipo === ProductoTipoEnum.INSUMO ||
        producto.tipo === ProductoTipoEnum.REVENTA
      ) {
        producto.precioCosto = nuevoCostoFixed;
        await productoRepoTx.save(producto);
        if (producto.tipo === ProductoTipoEnum.INSUMO && costoChanged) {
          insumoRecalcId = producto.id;
        }
      }

      const unidadMeta = this.getUnidadBaseMeta(producto);
      const mov = alteraRepoTx.create({
        tipo: 'INGRESO',
        cantidad: this.formatCantidad(cantidad),
        unidad: unidadMeta.unidad,
        factorABase: unidadMeta.factorABase,
        motivo: null,
        costoIngresoUnitarioTotal: this.formatMonto(costoIngreso),
        aplicaCreditoFiscal,
        ivaTasa: datosTributarios.ivaTasa,
        netoUnitario: datosTributarios.netoUnitario,
        ivaUnitario: datosTributarios.ivaUnitario,
        producto,
        ubicacion,
        origen: null,
        destino: null,
        usuario: { idUsuario: usuarioId } as UserEntity,
      });

      const savedMov = await alteraRepoTx.save(mov);

      await this.finanzasService.registrarEgresoInventarioIngreso(
        {
          movimientoAlteraId: savedMov.id,
          cantidad,
          costoIngresoUnitarioTotal: costoIngreso,
          fecha: savedMov.fecha,
          aplicaCreditoFiscal,
          documentoRef: savedMov.documentoRef,
          productoId: producto.id,
          productoNombre: producto.name,
        },
        manager,
      );

      return savedMov;
    });

    if (insumoRecalcId) {
      await this.recetasService.recalculateCostosByInsumo(insumoRecalcId);
    }

    return mov;
  }

  async registrarAjuste(dto: CreateAjusteDto, usuarioId: string) {
    const cantidad = Number(dto.cantidad);
    if (!Number.isFinite(cantidad) || cantidad === 0) {
      throw new BadRequestException('cantidad debe ser un número distinto de 0');
    }

    const motivo = dto.motivo?.trim();
    if (!motivo) throw new BadRequestException('motivo es requerido');

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);

      const producto = await this.getProductoOperableOrThrow(dto.productoId, 'ajustar stock de');
      const ubicacion = await this.getUbicacionOrThrow(dto.ubicacionId);

      const stockRow = await stockRepoTx.findOne({
        where: {
          producto: { id: producto.id },
          ubicacion: { id: ubicacion.id },
        } as any,
        relations: { producto: true, ubicacion: true },
      });

      const cantidadActual = Number(stockRow?.cantidad ?? 0);
      const nuevaCantidad = cantidadActual + cantidad;

      if (nuevaCantidad < 0) {
        throw new BadRequestException('El ajuste dejaría el stock en negativo');
      }

      if (stockRow) {
        stockRow.cantidad = this.formatCantidad(nuevaCantidad);
        await stockRepoTx.save(stockRow);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto,
            ubicacion,
            cantidad: this.formatCantidad(nuevaCantidad),
          }),
        );
      }

      const unidadMeta = this.getUnidadBaseMeta(producto);
      const mov = alteraRepoTx.create({
        tipo: 'AJUSTE',
        cantidad: this.formatCantidad(cantidad),
        unidad: unidadMeta.unidad,
        factorABase: unidadMeta.factorABase,
        motivo,
        costoIngresoUnitarioTotal: null,
        aplicaCreditoFiscal: null,
        ivaTasa: null,
        netoUnitario: null,
        ivaUnitario: null,
        producto,
        ubicacion,
        origen: null,
        destino: null,
        usuario: { idUsuario: usuarioId } as UserEntity,
      });

      return alteraRepoTx.save(mov);
    });
  }

  listarCausasAjusteOperativo() {
    return AJUSTE_OPERATIVO_CAUSAS.map((codigo) => ({
      codigo,
      nombre: AJUSTE_OPERATIVO_CAUSAS_LABEL[codigo],
    }));
  }

  async registrarAjusteOperativo(dto: CreateAjusteOperativoDto, usuarioId: string) {
    const cantidad = Number(dto.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }

    const causa = dto.causa as AjusteOperativoCausa;
    if (!AJUSTE_OPERATIVO_CAUSAS.includes(causa)) {
      throw new BadRequestException('causa no válida para ajuste operativo');
    }

    const label = AJUSTE_OPERATIVO_CAUSAS_LABEL[causa];
    const observacion = dto.observacion?.trim();
    const motivo = observacion
      ? `[OPERATIVO:${causa}] ${label} - ${observacion}`
      : `[OPERATIVO:${causa}] ${label}`;

    return this.registrarAjuste(
      {
        productoId: dto.productoId,
        ubicacionId: dto.ubicacionId,
        cantidad: -Math.abs(cantidad),
        motivo: motivo.slice(0, 300),
      },
      usuarioId,
    );
  }

  async registrarAjusteDesdeInconsistencia(
    dto: {
      productoId: string;
      ubicacionId: string;
      cantidad: number;
      motivo: string;
      categoria: string;
    },
    usuarioId: string,
  ) {
    if (!Number.isFinite(dto.cantidad) || dto.cantidad >= 0) {
      throw new BadRequestException(
        'El ajuste por inconsistencia debe ser negativo (descuento de stock).',
      );
    }

    const motivo = `[INCONSISTENCIA:${dto.categoria}] ${dto.motivo}`.slice(0, 300);
    const mov = await this.registrarAjuste(
      {
        productoId: dto.productoId,
        ubicacionId: dto.ubicacionId,
        cantidad: dto.cantidad,
        motivo,
      },
      usuarioId,
    );

    if (!mov.documentoRef) {
      mov.documentoRef = randomUUID();
      return this.alteraRepo.save(mov);
    }

    return mov;
  }

  async registrarTraspaso(dto: CreateTraspasoDto, usuarioId: string) {
    const cantidad = Number(dto.cantidad);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }

    if (dto.origenId === dto.destinoId) {
      throw new BadRequestException('origen y destino no pueden ser iguales');
    }

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);

      const producto = await this.getProductoOperableOrThrow(dto.productoId, 'traspasar stock de');
      const origen = await this.getUbicacionOrThrow(dto.origenId);
      const destino = await this.getUbicacionOrThrow(dto.destinoId);

      const stockOrigen = await stockRepoTx.findOne({
        where: {
          producto: { id: producto.id },
          ubicacion: { id: origen.id },
        } as any,
        relations: { producto: true, ubicacion: true },
      });

      const origenActual = Number(stockOrigen?.cantidad ?? 0);
      if (origenActual < cantidad) {
        throw new BadRequestException('Stock insuficiente en la ubicación origen');
      }

      const stockDestino = await stockRepoTx.findOne({
        where: {
          producto: { id: producto.id },
          ubicacion: { id: destino.id },
        } as any,
        relations: { producto: true, ubicacion: true },
      });

      stockOrigen!.cantidad = this.formatCantidad(origenActual - cantidad);
      await stockRepoTx.save(stockOrigen!);

      if (stockDestino) {
        const actual = Number(stockDestino.cantidad ?? 0);
        stockDestino.cantidad = this.formatCantidad(actual + cantidad);
        await stockRepoTx.save(stockDestino);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto,
            ubicacion: destino,
            cantidad: this.formatCantidad(cantidad),
          }),
        );
      }

      const unidadMeta = this.getUnidadBaseMeta(producto);
      const mov = alteraRepoTx.create({
        tipo: 'TRASPASO',
        cantidad: this.formatCantidad(cantidad),
        unidad: unidadMeta.unidad,
        factorABase: unidadMeta.factorABase,
        motivo: null,
        costoIngresoUnitarioTotal: null,
        aplicaCreditoFiscal: null,
        ivaTasa: null,
        netoUnitario: null,
        ivaUnitario: null,
        producto,
        ubicacion: null,
        origen,
        destino,
        usuario: { idUsuario: usuarioId } as UserEntity,
      });

      return alteraRepoTx.save(mov);
    });
  }

  async consultarStock(search?: string) {
    const term = search?.trim();

    const where = term
      ? [
          { name: ILike(`%${term}%`) },
          { internalCode: ILike(`%${term}%`) },
          { barcode: ILike(`%${term}%`) },
        ]
      : undefined;

    const productos = await this.productoRepo.find({
      where: where as any,
      relations: { stocks: { ubicacion: true } },
      order: { createdAt: 'DESC' },
    });

    const filtrados = productos.filter((p) => p.isActive && p.tipo !== ProductoTipoEnum.COMIDA);
    const productoIds = filtrados.map((p) => p.id);
    const hojaItems =
      productoIds.length > 0
        ? await this.hojaCompraItemRepo.find({
            where: { producto: { id: In(productoIds) } } as any,
            relations: { producto: true },
          })
        : [];
    const hojaProductoIds = new Set(hojaItems.map((it) => it.producto.id));

    return filtrados.map((p) => {
      const stocks = (p.stocks ?? []).map((s) => ({
        ubicacion: {
          id: s.ubicacion.id,
          nombre: s.ubicacion.nombre,
          tipo: s.ubicacion.tipo,
        },
        cantidad: Number(s.cantidad ?? 0),
      }));

      const cantidadTotal = stocks.reduce((sum, s) => sum + s.cantidad, 0);

      return {
        id: p.id,
        name: p.name,
        internalCode: p.internalCode,
        barcode: p.barcode,
        unidadBase: p.unidadBase,
        tipo: p.tipo,
        isActive: p.isActive,
        enHojaCompra: hojaProductoIds.has(p.id),
        stocks,
        cantidadTotal,
      };
    });
  }

  async listarSalaObjetivos() {
    const sala = await this.getSalaActivaOrThrow();

    const objetivos = await this.salaObjetivoRepo.find({
      relations: { producto: true },
      order: { createdAt: 'DESC' },
    });

    if (objetivos.length === 0) return [];

    const productoIds = objetivos.map((o) => o.producto.id);

    const rawStock = await this.stockRepo
      .createQueryBuilder('ps')
      .select('ps.id_producto', 'productoId')
      .addSelect('COALESCE(SUM(ps.cantidad), 0)', 'cantidad')
      .where('ps.id_ubicacion = :salaId', { salaId: sala.id })
      .andWhere('ps.id_producto IN (:...productoIds)', { productoIds })
      .groupBy('ps.id_producto')
      .getRawMany<{ productoId: string; cantidad: string }>();

    const stockByProducto = new Map<string, number>();
    for (const row of rawStock) {
      stockByProducto.set(row.productoId, Number(row.cantidad ?? 0));
    }

    return objetivos.map((o) => {
      const stockTeoricoSala = stockByProducto.get(o.producto.id) ?? 0;
      return this.toSalaObjetivoResponse(o, stockTeoricoSala);
    });
  }

  async crearSalaObjetivo(dto: CreateInventarioSalaObjetivoDto) {
    const producto = await this.getProductoOrThrow(dto.productoId);
    this.assertProductoOperable(producto, 'definir stock ideal para');

    const exists = await this.salaObjetivoRepo.findOne({
      where: { producto: { id: producto.id } } as any,
    });
    if (exists) {
      throw new ConflictException('El producto ya tiene un stock ideal configurado para sala');
    }

    const stockIdeal = this.parseStockIdeal(dto.stockIdeal);
    const objetivo = await this.salaObjetivoRepo.save(
      this.salaObjetivoRepo.create({
        producto: { id: producto.id } as any,
        stockIdeal: this.formatCantidad(stockIdeal),
      }),
    );

    const saved = await this.salaObjetivoRepo.findOne({
      where: { id: objetivo.id },
      relations: { producto: true },
    });
    if (!saved) throw new NotFoundException('No se pudo crear el objetivo de sala');

    const sala = await this.getSalaActivaOrThrow();
    const stockRow = await this.stockRepo.findOne({
      where: { producto: { id: saved.producto.id }, ubicacion: { id: sala.id } } as any,
    });

    return this.toSalaObjetivoResponse(saved, Number(stockRow?.cantidad ?? 0));
  }

  async actualizarSalaObjetivo(id: string, dto: UpdateInventarioSalaObjetivoDto) {
    const objetivo = await this.salaObjetivoRepo.findOne({
      where: { id },
      relations: { producto: true },
    });
    if (!objetivo) throw new NotFoundException('Objetivo de sala no encontrado');

    this.assertProductoOperable(objetivo.producto, 'actualizar stock ideal para');

    const stockIdeal = this.parseStockIdeal(dto.stockIdeal);
    objetivo.stockIdeal = this.formatCantidad(stockIdeal);
    await this.salaObjetivoRepo.save(objetivo);

    const sala = await this.getSalaActivaOrThrow();
    const stockRow = await this.stockRepo.findOne({
      where: { producto: { id: objetivo.producto.id }, ubicacion: { id: sala.id } } as any,
    });

    return this.toSalaObjetivoResponse(objetivo, Number(stockRow?.cantidad ?? 0));
  }

  async eliminarSalaObjetivo(id: string) {
    const objetivo = await this.salaObjetivoRepo.findOne({ where: { id } });
    if (!objetivo) throw new NotFoundException('Objetivo de sala no encontrado');

    await this.salaObjetivoRepo.remove(objetivo);
    return { ok: true };
  }

  async listarProductosImportantes() {
    const items = await this.productoImportanteRepo.find({
      relations: { producto: true },
      order: { createdAt: 'DESC' },
    });

    if (items.length === 0) return [];

    const productoIds = items.map((item) => item.producto.id);
    const stockByProducto = await this.getStockTotalByProductoIds(productoIds);
    const hojaItems = await this.hojaCompraItemRepo.find({
      where: { producto: { id: In(productoIds) } } as any,
      relations: { producto: true },
    });
    const hojaProductoIds = new Set(hojaItems.map((it) => it.producto.id));

    return items.map((item) => {
      const stockTotal = stockByProducto.get(item.producto.id) ?? 0;
      const enHojaCompra = hojaProductoIds.has(item.producto.id);
      return this.toProductoImportanteResponse(item, stockTotal, enHojaCompra);
    });
  }

  async crearProductoImportante(dto: CreateInventarioProductoImportanteDto) {
    const producto = await this.getProductoOrThrow(dto.productoId);
    this.assertProductoOperable(producto, 'definir cantidad minima para');

    const exists = await this.productoImportanteRepo.findOne({
      where: { producto: { id: producto.id } } as any,
    });
    if (exists) {
      throw new ConflictException('El producto ya está marcado como importante');
    }

    const cantidadMinima = this.parseCantidadMinima(dto.cantidadMinima);
    const savedEntity = await this.productoImportanteRepo.save(
      this.productoImportanteRepo.create({
        producto: { id: producto.id } as any,
        cantidadMinima: this.formatCantidad(cantidadMinima),
      }),
    );

    const saved = await this.productoImportanteRepo.findOne({
      where: { id: savedEntity.id },
      relations: { producto: true },
    });
    if (!saved) throw new NotFoundException('No se pudo crear el producto importante');

    const stockTotal = await this.getStockTotalByProductoId(saved.producto.id, this.stockRepo);
    const faltante = Math.max(cantidadMinima - stockTotal, 0);
    await this.syncHojaCompraFromFaltante(saved.producto.id, faltante);

    const enHojaCompra = !!(await this.hojaCompraItemRepo.findOne({
      where: { producto: { id: saved.producto.id } } as any,
    }));

    return this.toProductoImportanteResponse(saved, stockTotal, enHojaCompra);
  }

  async actualizarProductoImportante(id: string, dto: UpdateInventarioProductoImportanteDto) {
    const item = await this.productoImportanteRepo.findOne({
      where: { id },
      relations: { producto: true },
    });
    if (!item) throw new NotFoundException('Producto importante no encontrado');

    this.assertProductoOperable(item.producto, 'actualizar cantidad minima para');

    const cantidadMinima = this.parseCantidadMinima(dto.cantidadMinima);
    item.cantidadMinima = this.formatCantidad(cantidadMinima);
    await this.productoImportanteRepo.save(item);

    const stockTotal = await this.getStockTotalByProductoId(item.producto.id, this.stockRepo);
    const faltante = Math.max(cantidadMinima - stockTotal, 0);
    await this.syncHojaCompraFromFaltante(item.producto.id, faltante);

    const enHojaCompra = !!(await this.hojaCompraItemRepo.findOne({
      where: { producto: { id: item.producto.id } } as any,
    }));

    return this.toProductoImportanteResponse(item, stockTotal, enHojaCompra);
  }

  async eliminarProductoImportante(id: string) {
    const item = await this.productoImportanteRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Producto importante no encontrado');

    await this.productoImportanteRepo.remove(item);
    return { ok: true };
  }

  async listarHojaCompra() {
    const items = await this.hojaCompraItemRepo.find({
      relations: { producto: true },
      order: { createdAt: 'DESC' },
    });

    if (items.length === 0) return [];

    const productoIds = items.map((item) => item.producto.id);
    const stockByProducto = await this.getStockTotalByProductoIds(productoIds);

    return items.map((item) => {
      const stockTotal = stockByProducto.get(item.producto.id) ?? 0;
      return this.toHojaCompraItemResponse(item, stockTotal);
    });
  }

  async agregarHojaCompraItem(dto: AddInventarioHojaCompraItemDto) {
    const producto = await this.getProductoOrThrow(dto.productoId);
    this.assertProductoOperable(producto, 'agregar a la hoja de compra');

    const cantidad = this.parseCantidad(dto.cantidad);
    const existing = await this.hojaCompraItemRepo.findOne({
      where: { producto: { id: producto.id } } as any,
      relations: { producto: true },
    });

    let item: InventarioHojaCompraItemEntity;
    if (existing) {
      const nuevaCantidad = Number(existing.cantidad ?? 0) + cantidad;
      existing.cantidad = this.formatCantidad(nuevaCantidad);
      item = await this.hojaCompraItemRepo.save(existing);
    } else {
      item = await this.hojaCompraItemRepo.save(
        this.hojaCompraItemRepo.create({
          producto: { id: producto.id } as any,
          cantidad: this.formatCantidad(cantidad),
        }),
      );
    }

    const saved = await this.hojaCompraItemRepo.findOne({
      where: { id: item.id },
      relations: { producto: true },
    });
    if (!saved) throw new NotFoundException('No se pudo guardar el item de hoja de compra');

    const stockTotal = await this.getStockTotalByProductoId(saved.producto.id, this.stockRepo);
    return this.toHojaCompraItemResponse(saved, stockTotal);
  }

  async actualizarHojaCompraItem(id: string, dto: UpdateInventarioHojaCompraItemDto) {
    const item = await this.hojaCompraItemRepo.findOne({
      where: { id },
      relations: { producto: true },
    });
    if (!item) throw new NotFoundException('Item de hoja de compra no encontrado');

    this.assertProductoOperable(item.producto, 'actualizar en la hoja de compra');

    const cantidad = this.parseCantidad(dto.cantidad);
    item.cantidad = this.formatCantidad(cantidad);
    await this.hojaCompraItemRepo.save(item);

    const stockTotal = await this.getStockTotalByProductoId(item.producto.id, this.stockRepo);
    return this.toHojaCompraItemResponse(item, stockTotal);
  }

  async eliminarHojaCompraItem(id: string) {
    const item = await this.hojaCompraItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Item de hoja de compra no encontrado');

    await this.hojaCompraItemRepo.remove(item);
    return { ok: true };
  }

  async limpiarHojaCompra() {
    await this.hojaCompraItemRepo.createQueryBuilder().delete().execute();

    const importantes = await this.productoImportanteRepo.find({ relations: { producto: true } });
    if (importantes.length === 0) return [];

    const productoIds = importantes.map((item) => item.producto.id);
    const stockByProducto = await this.getStockTotalByProductoIds(productoIds);

    const nuevos = importantes
      .map((item) => {
        const stockTotal = stockByProducto.get(item.producto.id) ?? 0;
        const cantidadMinima = Number(item.cantidadMinima ?? 0);
        const faltante = Math.max(cantidadMinima - stockTotal, 0);
        return { item, faltante };
      })
      .filter(({ item, faltante }) => {
        const productoOperable =
          item.producto.isActive && item.producto.tipo !== ProductoTipoEnum.COMIDA;
        return productoOperable && faltante > 0;
      })
      .map(({ item, faltante }) =>
        this.hojaCompraItemRepo.create({
          producto: { id: item.producto.id } as any,
          cantidad: this.formatCantidad(faltante),
        }),
      );

    if (nuevos.length > 0) {
      await this.hojaCompraItemRepo.save(nuevos);
    }

    return this.listarHojaCompra();
  }

  async convertirProducto(dto: ConvertirProductoDto, usuarioId: string) {
    if (dto.productoOrigenId === dto.productoDestinoId) {
      throw new BadRequestException('productoOrigenId y productoDestinoId no pueden ser iguales');
    }
    const cantidadOrigen = this.parseCantidad(dto.cantidadOrigen);
    const factor = Number(dto.factor);
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new BadRequestException('factor debe ser un número > 0');
    }

    let insumoRecalcId: string | null = null;

    await this.dataSource.transaction(async (manager) => {
      const productoOrigen = await manager.getRepository(ProductoEntity).findOne({
        where: { id: dto.productoOrigenId },
      });
      if (!productoOrigen) throw new NotFoundException('Producto origen no encontrado');
      this.assertProductoOperable(productoOrigen, 'convertir');

      const productoDestino = await manager.getRepository(ProductoEntity).findOne({
        where: { id: dto.productoDestinoId },
      });
      if (!productoDestino) throw new NotFoundException('Producto destino no encontrado');
      this.assertProductoOperable(productoDestino, 'convertir');

      const ubicacion = await manager.getRepository(UbicacionEntity).findOne({
        where: { id: dto.ubicacionId },
      });
      if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');

      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const productoRepoTx = manager.getRepository(ProductoEntity);

      const stockOrigen = await stockRepoTx.findOne({
        where: { producto: { id: productoOrigen.id } as any, ubicacion: { id: ubicacion.id } as any },
      });

      if (!stockOrigen) {
        throw new BadRequestException('Stock no inicializado en producto origen');
      }

      const disponible = Number(stockOrigen?.cantidad ?? 0);
      if (disponible < cantidadOrigen) {
        throw new BadRequestException('Stock insuficiente en producto origen');
      }

      stockOrigen!.cantidad = this.formatCantidad(disponible - cantidadOrigen);
      await stockRepoTx.save(stockOrigen!);

      const cantidadDestino = cantidadOrigen * factor;
      const stockTotalDestino = await this.getStockTotalByProductoId(productoDestino.id, stockRepoTx);

      const costoOrigen = Number(productoOrigen.precioCosto ?? 0);
      if (!Number.isFinite(costoOrigen)) {
        throw new BadRequestException('precioCosto del producto origen no es válido');
      }
      const costoActualDestino = Number(productoDestino.precioCosto ?? 0);
      if (!Number.isFinite(costoActualDestino)) {
        throw new BadRequestException('precioCosto del producto destino no es válido');
      }

      const costoTotalTransferido = cantidadOrigen * costoOrigen;

      const stockDestino = await stockRepoTx.findOne({
        where: { producto: { id: productoDestino.id } as any, ubicacion: { id: ubicacion.id } as any },
      });

      if (stockDestino) {
        const actual = Number(stockDestino.cantidad ?? 0);
        stockDestino.cantidad = this.formatCantidad(actual + cantidadDestino);
        await stockRepoTx.save(stockDestino);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto: { id: productoDestino.id } as any,
            ubicacion: { id: ubicacion.id } as any,
            cantidad: this.formatCantidad(cantidadDestino),
          }),
        );
      }

      if (
        productoDestino.tipo === ProductoTipoEnum.INSUMO ||
        productoDestino.tipo === ProductoTipoEnum.REVENTA
      ) {
        const nuevaCantidadTotal = stockTotalDestino + cantidadDestino;
        const nuevoCostoProm =
          (stockTotalDestino * costoActualDestino + costoTotalTransferido) / nuevaCantidadTotal;
        const nuevoCostoFixed = nuevoCostoProm.toFixed(2);
        const costoChanged = Number(nuevoCostoFixed) !== costoActualDestino;
        productoDestino.precioCosto = nuevoCostoFixed;
        await productoRepoTx.save(productoDestino);
        if (productoDestino.tipo === ProductoTipoEnum.INSUMO && costoChanged) {
          insumoRecalcId = productoDestino.id;
        }
      }

      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const unidadOrigen = this.getUnidadBaseMeta(productoOrigen);
      const unidadDestino = this.getUnidadBaseMeta(productoDestino);
      const documentoRef = randomUUID();

      await alteraRepoTx.save(
        alteraRepoTx.create({
          tipo: 'CONVERSION_PRODUCTO',
          cantidad: this.formatCantidad(cantidadOrigen),
          unidad: unidadOrigen.unidad,
          factorABase: unidadOrigen.factorABase,
          motivo: `Conversión a ${productoDestino.name}`,
          costoIngresoUnitarioTotal: null,
          aplicaCreditoFiscal: null,
          ivaTasa: null,
          netoUnitario: null,
          ivaUnitario: null,
          producto: { id: productoOrigen.id } as any,
          ubicacion: { id: ubicacion.id } as any,
          origen: null,
          destino: null,
          usuario: { idUsuario: usuarioId } as UserEntity,
          documentoRef,
        }),
      );

      await alteraRepoTx.save(
        alteraRepoTx.create({
          tipo: 'CONVERSION_PRODUCTO',
          cantidad: this.formatCantidad(cantidadDestino),
          unidad: unidadDestino.unidad,
          factorABase: unidadDestino.factorABase,
          motivo: `Conversión desde ${productoOrigen.name}`,
          costoIngresoUnitarioTotal: null,
          aplicaCreditoFiscal: null,
          ivaTasa: null,
          netoUnitario: null,
          ivaUnitario: null,
          producto: { id: productoDestino.id } as any,
          ubicacion: { id: ubicacion.id } as any,
          origen: null,
          destino: null,
          usuario: { idUsuario: usuarioId } as UserEntity,
          documentoRef,
        }),
      );

      return { ok: true };
    });

    if (insumoRecalcId) {
      await this.recetasService.recalculateCostosByInsumo(insumoRecalcId);
    }

    return { ok: true };
  }

  async obtenerMovimientoDetalle(tipo: 'SALIDA' | 'CONVERSION_PRODUCTO', ref: string) {
    if (tipo !== 'SALIDA' && tipo !== 'CONVERSION_PRODUCTO') {
      throw new BadRequestException('tipo inválido');
    }
    if (!ref) throw new BadRequestException('ref es requerido');

    if (tipo === 'SALIDA') {
      const ventaId = Number(ref);
      if (!Number.isFinite(ventaId) || ventaId <= 0) {
        throw new BadRequestException('ref inválido');
      }

      const items = await this.alteraRepo.find({
        where: { tipo: 'SALIDA', venta: { idVenta: ventaId } as any } as any,
        relations: { producto: true, ubicacion: true, usuario: true, venta: true },
        order: { fecha: 'ASC' },
      });

      if (!items || items.length === 0) {
        throw new NotFoundException('Movimiento no encontrado');
      }

      const first = items[0];

      return {
        tipo,
        ref: String(ventaId),
        fecha: first.fecha,
        usuario: first.usuario ? { id: first.usuario.idUsuario, email: first.usuario.email } : null,
        ubicacion: first.ubicacion
          ? { id: first.ubicacion.id, nombre: first.ubicacion.nombre, tipo: first.ubicacion.tipo }
          : null,
        items: items.map((it) => ({
          id: it.id,
          cantidad: Number(it.cantidad ?? 0),
          unidad: it.unidad ?? it.producto?.unidadBase ?? null,
          producto: it.producto
            ? {
                id: it.producto.id,
                name: it.producto.name,
                internalCode: it.producto.internalCode,
                barcode: it.producto.barcode ?? null,
                tipo: it.producto.tipo,
              }
            : null,
        })),
      };
    }

    const items = await this.alteraRepo.find({
      where: { tipo: 'CONVERSION_PRODUCTO', documentoRef: ref } as any,
      relations: { producto: true, ubicacion: true, usuario: true },
      order: { fecha: 'ASC' },
    });

    if (!items || items.length === 0) {
      throw new NotFoundException('Movimiento no encontrado');
    }

    const first = items[0];
    const origen = items.find((it) => (it.motivo ?? '').startsWith('Conversión a '));
    const destino = items.find((it) => (it.motivo ?? '').startsWith('Conversión desde '));

    const cantidadOrigen = Number(origen?.cantidad ?? 0);
    const cantidadDestino = Number(destino?.cantidad ?? 0);
    const factor =
      cantidadOrigen > 0 ? Number((cantidadDestino / cantidadOrigen).toFixed(6)) : null;

    return {
      tipo,
      ref,
      fecha: first.fecha,
      usuario: first.usuario ? { id: first.usuario.idUsuario, email: first.usuario.email } : null,
      ubicacion: first.ubicacion
        ? { id: first.ubicacion.id, nombre: first.ubicacion.nombre, tipo: first.ubicacion.tipo }
        : null,
      resumen: {
        factor,
        cantidadOrigen,
        cantidadDestino,
      },
      items: items.map((it) => ({
        id: it.id,
        cantidad: Number(it.cantidad ?? 0),
        unidad: it.unidad ?? it.producto?.unidadBase ?? null,
        producto: it.producto
          ? {
              id: it.producto.id,
              name: it.producto.name,
              internalCode: it.producto.internalCode,
              barcode: it.producto.barcode ?? null,
              tipo: it.producto.tipo,
            }
          : null,
      })),
    };
  }

  async obtenerConversion(origenId?: string, destinoId?: string) {
    if (!origenId || !destinoId) {
      throw new BadRequestException('origenId y destinoId son requeridos');
    }

    const direct = await this.conversionRepo.findOne({
      where: {
        productoOrigen: { id: origenId },
        productoDestino: { id: destinoId },
        isActive: true,
      } as any,
      relations: { productoOrigen: true, productoDestino: true },
    });

    if (direct) {
      return {
        factor: Number(direct.factor ?? 0),
        source: 'direct',
      };
    }

    const inverse = await this.conversionRepo.findOne({
      where: {
        productoOrigen: { id: destinoId },
        productoDestino: { id: origenId },
        isActive: true,
      } as any,
      relations: { productoOrigen: true, productoDestino: true },
    });

    if (inverse) {
      const value = Number(inverse.factor ?? 0);
      if (!Number.isFinite(value) || value === 0) {
        return { factor: null, source: 'none' };
      }
      return {
        factor: Number((1 / value).toFixed(6)),
        source: 'inverse',
      };
    }

    return { factor: null, source: 'none' };
  }

  async guardarConversion(dto: CreateConversionFactorDto) {
    if (dto.productoOrigenId === dto.productoDestinoId) {
      throw new BadRequestException('productoOrigenId y productoDestinoId no pueden ser iguales');
    }

    const factor = Number(dto.factor);
    if (!Number.isFinite(factor) || factor <= 0) {
      throw new BadRequestException('factor debe ser un número > 0');
    }

    const origen = await this.getProductoOperableOrThrow(
      dto.productoOrigenId,
      'guardar una conversión para',
    );
    const destino = await this.getProductoOperableOrThrow(
      dto.productoDestinoId,
      'guardar una conversión para',
    );

    const existing = await this.conversionRepo.findOne({
      where: {
        productoOrigen: { id: origen.id },
        productoDestino: { id: destino.id },
      } as any,
    });

    if (existing) {
      existing.factor = factor.toFixed(6);
      existing.isActive = true;
      await this.conversionRepo.save(existing);
    } else {
      await this.conversionRepo.save(
        this.conversionRepo.create({
          productoOrigen: { id: origen.id } as any,
          productoDestino: { id: destino.id } as any,
          factor: factor.toFixed(6),
          isActive: true,
        }),
      );
    }

    return { ok: true };
  }

  async listarMovimientos(limit = 200) {
    const take = Math.min(Math.max(Number(limit) || 200, 1), 500);

    const items = await this.alteraRepo.find({
      relations: {
        producto: true,
        ubicacion: true,
        origen: true,
        destino: true,
        usuario: true,
        venta: true,
      },
      order: { fecha: 'DESC' },
      take,
    });

    return items.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: Number(m.cantidad ?? 0),
      unidad: m.unidad ?? null,
      motivo: m.motivo,
      costoIngresoUnitarioTotal:
        m.costoIngresoUnitarioTotal !== null ? Number(m.costoIngresoUnitarioTotal) : null,
      aplicaCreditoFiscal: m.aplicaCreditoFiscal,
      ivaTasa: m.ivaTasa !== null ? Number(m.ivaTasa) : null,
      netoUnitario: m.netoUnitario !== null ? Number(m.netoUnitario) : null,
      ivaUnitario: m.ivaUnitario !== null ? Number(m.ivaUnitario) : null,
      fecha: m.fecha,
      producto: {
        id: m.producto?.id,
        name: m.producto?.name,
        internalCode: m.producto?.internalCode,
        barcode: m.producto?.barcode ?? null,
      },
      ubicacion: m.ubicacion
        ? { id: m.ubicacion.id, nombre: m.ubicacion.nombre, tipo: m.ubicacion.tipo }
        : null,
      origen: m.origen
        ? { id: m.origen.id, nombre: m.origen.nombre, tipo: m.origen.tipo }
        : null,
      destino: m.destino
        ? { id: m.destino.id, nombre: m.destino.nombre, tipo: m.destino.tipo }
        : null,
      usuario: m.usuario
        ? { id: m.usuario.idUsuario, email: m.usuario.email }
        : null,
      ventaId: m.venta?.idVenta ?? null,
      documentoRef: m.documentoRef ?? null,
    }));
  }

  async listarDocumentos(limit = 200) {
    const take = Math.min(Math.max(Number(limit) || 200, 1), 500);

    const raw = await this.alteraRepo
      .createQueryBuilder('a')
      .select('a.documentoRef', 'documentoRef')
      .addSelect('MAX(a.fecha)', 'fecha')
      .where('a.documentoRef IS NOT NULL')
      .andWhere('a.tipo IN (:...tipos)', { tipos: ['INGRESO', 'TRASPASO', 'AJUSTE'] })
      .groupBy('a.documentoRef')
      .orderBy('MAX(a.fecha)', 'DESC')
      .limit(take)
      .getRawMany();

    const refs = raw.map((r) => r.documentoRef).filter(Boolean);
    if (refs.length === 0) return [];

    const items = await this.alteraRepo.find({
      where: { documentoRef: In(refs), tipo: In(['INGRESO', 'TRASPASO', 'AJUSTE']) } as any,
      relations: { producto: true, ubicacion: true, origen: true, destino: true, usuario: true },
      order: { fecha: 'DESC' },
    });

    const grouped = new Map<string, AlteraEntity[]>();
    for (const item of items) {
      const ref = item.documentoRef ?? '';
      if (!ref) continue;
      if (!grouped.has(ref)) grouped.set(ref, []);
      grouped.get(ref)!.push(item);
    }

    return refs
      .map((ref) => {
        const group = grouped.get(ref);
        if (!group || group.length === 0) return null;
        const first = group[0];
        const itemsCount = group.length;
      const totalCantidad = group.reduce((sum, it) => sum + Number(it.cantidad ?? 0), 0);
        const fecha = group.reduce((max, it) => (it.fecha > max ? it.fecha : max), first.fecha);
        const origen = first.origen
          ? { id: first.origen.id, nombre: first.origen.nombre, tipo: first.origen.tipo }
          : null;
        const destinoEntity = this.resolveDestinoFromMov(first);
        const destino = destinoEntity
          ? { id: destinoEntity.id, nombre: destinoEntity.nombre, tipo: destinoEntity.tipo }
          : null;
        const usuario = first.usuario
          ? { id: first.usuario.idUsuario, email: first.usuario.email }
          : null;

        return {
          documentoRef: ref,
          tipo: first.tipo,
          origen,
          destino,
          usuario,
          fecha,
          itemsCount,
          totalCantidad,
        };
      })
      .filter(Boolean);
  }
}
