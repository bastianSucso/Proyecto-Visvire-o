import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { AlteraEntity } from './entities/altera.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { ProductoTipoEntity, ProductoTipoEnum } from '../productos/entities/producto-tipo.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { CreateAjusteDto } from './dto/create-ajuste.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { CreateDocumentoIngresoDto } from './dto/create-documento-ingreso.dto';
import { CreateDocumentoTraspasoDto } from './dto/create-documento-traspaso.dto';
import { ConvertirProductoDto } from './dto/convertir-producto.dto';
import { CreateConversionFactorDto } from './dto/create-conversion-factor.dto';
import { ProductoConversionEntity } from './entities/producto-conversion.entity';

@Injectable()
export class InventarioService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(AlteraEntity)
    private readonly alteraRepo: Repository<AlteraEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(ProductoTipoEntity)
    private readonly tipoRepo: Repository<ProductoTipoEntity>,
    @InjectRepository(UbicacionEntity)
    private readonly ubicacionRepo: Repository<UbicacionEntity>,
    @InjectRepository(ProductoStockEntity)
    private readonly stockRepo: Repository<ProductoStockEntity>,
    @InjectRepository(ProductoConversionEntity)
    private readonly conversionRepo: Repository<ProductoConversionEntity>,
  ) {}

  private async getProductoOrThrow(productoId: string) {
    const producto = await this.productoRepo.findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  private async assertProductoNoComida(productoId: string) {
    const match = await this.tipoRepo.findOne({
      where: { producto: { id: productoId } as any, tipo: ProductoTipoEnum.COMIDA } as any,
    });
    if (match) {
      throw new BadRequestException('No se permite ingresar o traspasar productos COMIDA');
    }
  }

  private async getUbicacionOrThrow(ubicacionId: string) {
    const ubicacion = await this.ubicacionRepo.findOne({ where: { id: ubicacionId } });
    if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');
    return ubicacion;
  }

  private parseCantidad(raw: number) {
    const cantidad = Number(raw);
    if (!Number.isFinite(cantidad) || cantidad <= 0) {
      throw new BadRequestException('cantidad debe ser un número > 0');
    }
    return cantidad;
  }

  private formatCantidad(value: number) {
    return value.toFixed(3);
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
        unidadBase: it.producto?.unidadBase ?? null,
        barcode: it.producto?.barcode ?? null,
        producto: it.producto
          ? {
              id: it.producto.id,
              name: it.producto.name,
              internalCode: it.producto.internalCode,
              barcode: it.producto.barcode ?? null,
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

    await this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);

      for (const it of dto.items) {
        await this.assertProductoNoComida(it.productoId);
        const producto = await this.getProductoOrThrow(it.productoId);
        const cantidad = this.parseCantidad(it.cantidad);

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

        const unidadMeta = this.getUnidadBaseMeta(producto);
        await alteraRepoTx.save(
          alteraRepoTx.create({
            tipo: 'INGRESO',
            cantidad: this.formatCantidad(cantidad),
            unidad: unidadMeta.unidad,
            factorABase: unidadMeta.factorABase,
            motivo: null,
            producto: { id: producto.id } as any,
            ubicacion: { id: destino.id } as any,
            origen: null,
            destino: null,
            usuario: { idUsuario: usuarioId } as UserEntity,
            documentoRef,
          }),
        );
      }
    });

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
        await this.assertProductoNoComida(it.productoId);
        const producto = await this.getProductoOrThrow(it.productoId);

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

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);

      await this.assertProductoNoComida(dto.productoId);
      const producto = await this.getProductoOrThrow(dto.productoId);
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
        tipo: 'INGRESO',
        cantidad: this.formatCantidad(cantidad),
        unidad: unidadMeta.unidad,
        factorABase: unidadMeta.factorABase,
        motivo: null,
        producto,
        ubicacion,
        origen: null,
        destino: null,
        usuario: { idUsuario: usuarioId } as UserEntity,
      });

      return alteraRepoTx.save(mov);
    });
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

      const producto = await this.getProductoOrThrow(dto.productoId);
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
        producto,
        ubicacion,
        origen: null,
        destino: null,
        usuario: { idUsuario: usuarioId } as UserEntity,
      });

      return alteraRepoTx.save(mov);
    });
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

      await this.assertProductoNoComida(dto.productoId);
      await this.assertProductoNoComida(dto.productoId);
      const producto = await this.getProductoOrThrow(dto.productoId);
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
      relations: { stocks: { ubicacion: true }, tipos: true },
      order: { createdAt: 'DESC' },
    });

    const filtrados = productos.filter(
      (p) => !(p.tipos ?? []).some((tipo) => tipo.tipo === 'COMIDA'),
    );

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
        isActive: p.isActive,
        tipos: (p.tipos ?? []).map((t) => t.tipo),
        stocks,
        cantidadTotal,
      };
    });
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

    return this.dataSource.transaction(async (manager) => {
      const productoOrigen = await manager.getRepository(ProductoEntity).findOne({
        where: { id: dto.productoOrigenId },
      });
      if (!productoOrigen) throw new NotFoundException('Producto origen no encontrado');

      const productoDestino = await manager.getRepository(ProductoEntity).findOne({
        where: { id: dto.productoDestinoId },
      });
      if (!productoDestino) throw new NotFoundException('Producto destino no encontrado');

      const ubicacion = await manager.getRepository(UbicacionEntity).findOne({
        where: { id: dto.ubicacionId },
      });
      if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');

      const stockRepoTx = manager.getRepository(ProductoStockEntity);

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

      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const unidadOrigen = this.getUnidadBaseMeta(productoOrigen);
      const unidadDestino = this.getUnidadBaseMeta(productoDestino);

      await alteraRepoTx.save(
        alteraRepoTx.create({
          tipo: 'CONVERSION_PRODUCTO',
          cantidad: this.formatCantidad(cantidadOrigen),
          unidad: unidadOrigen.unidad,
          factorABase: unidadOrigen.factorABase,
          motivo: `Conversión a ${productoDestino.name}`,
          producto: { id: productoOrigen.id } as any,
          ubicacion: { id: ubicacion.id } as any,
          origen: null,
          destino: null,
          usuario: { idUsuario: usuarioId } as UserEntity,
          documentoRef: null,
        }),
      );

      await alteraRepoTx.save(
        alteraRepoTx.create({
          tipo: 'CONVERSION_PRODUCTO',
          cantidad: this.formatCantidad(cantidadDestino),
          unidad: unidadDestino.unidad,
          factorABase: unidadDestino.factorABase,
          motivo: `Conversión desde ${productoOrigen.name}`,
          producto: { id: productoDestino.id } as any,
          ubicacion: { id: ubicacion.id } as any,
          origen: null,
          destino: null,
          usuario: { idUsuario: usuarioId } as UserEntity,
          documentoRef: null,
        }),
      );

      return { ok: true };
    });
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

    const origen = await this.getProductoOrThrow(dto.productoOrigenId);
    const destino = await this.getProductoOrThrow(dto.productoDestinoId);

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
      },
      order: { fecha: 'DESC' },
      take,
    });

    return items.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      cantidad: Number(m.cantidad ?? 0),
      motivo: m.motivo,
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
      .groupBy('a.documentoRef')
      .orderBy('MAX(a.fecha)', 'DESC')
      .limit(take)
      .getRawMany();

    const refs = raw.map((r) => r.documentoRef).filter(Boolean);
    if (refs.length === 0) return [];

    const items = await this.alteraRepo.find({
      where: { documentoRef: In(refs) } as any,
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
