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
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { CreateAjusteDto } from './dto/create-ajuste.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { CreateDocumentoIngresoDto } from './dto/create-documento-ingreso.dto';
import { CreateDocumentoTraspasoDto } from './dto/create-documento-traspaso.dto';

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
  ) {}

  private async getProductoOrThrow(productoId: string) {
    const producto = await this.productoRepo.findOne({ where: { id: productoId } });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    return producto;
  }

  private async getUbicacionOrThrow(ubicacionId: string) {
    const ubicacion = await this.ubicacionRepo.findOne({ where: { id: ubicacionId } });
    if (!ubicacion) throw new NotFoundException('Ubicación no encontrada');
    return ubicacion;
  }

  private parseCantidad(raw: number) {
    const cantidad = Number(raw);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
    }
    return cantidad;
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
        cantidad: it.cantidad,
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
        const cantidad = this.parseCantidad(it.cantidad);
        const producto = await this.getProductoOrThrow(it.productoId);

        const stockRow = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: destino.id },
          } as any,
        });

        if (stockRow) {
          stockRow.cantidad = (stockRow.cantidad ?? 0) + cantidad;
          await stockRepoTx.save(stockRow);
        } else {
          await stockRepoTx.save(
            stockRepoTx.create({
              producto: { id: producto.id } as any,
              ubicacion: { id: destino.id } as any,
              cantidad,
            }),
          );
        }

        await alteraRepoTx.save(
          alteraRepoTx.create({
            tipo: 'INGRESO',
            cantidad,
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
        const producto = await this.getProductoOrThrow(it.productoId);

        const stockOrigen = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: origen.id },
          } as any,
        });

        const origenActual = stockOrigen?.cantidad ?? 0;
        if (origenActual < cantidad) {
          throw new BadRequestException('Stock insuficiente en ubicación origen');
        }

        stockOrigen!.cantidad = origenActual - cantidad;
        await stockRepoTx.save(stockOrigen!);

        const stockDestino = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: destino.id },
          } as any,
        });

        if (stockDestino) {
          stockDestino.cantidad = (stockDestino.cantidad ?? 0) + cantidad;
          await stockRepoTx.save(stockDestino);
        } else {
          await stockRepoTx.save(
            stockRepoTx.create({
              producto: { id: producto.id } as any,
              ubicacion: { id: destino.id } as any,
              cantidad,
            }),
          );
        }

        await alteraRepoTx.save(
          alteraRepoTx.create({
            tipo: 'TRASPASO',
            cantidad,
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
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
    }

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

      const cantidadActual = stockRow?.cantidad ?? 0;
      const nuevaCantidad = cantidadActual + cantidad;

      if (stockRow) {
        stockRow.cantidad = nuevaCantidad;
        await stockRepoTx.save(stockRow);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto,
            ubicacion,
            cantidad: nuevaCantidad,
          }),
        );
      }

      const mov = alteraRepoTx.create({
        tipo: 'INGRESO',
        cantidad,
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
    if (!Number.isInteger(cantidad) || cantidad === 0) {
      throw new BadRequestException('cantidad debe ser entero distinto de 0');
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

      const cantidadActual = stockRow?.cantidad ?? 0;
      const nuevaCantidad = cantidadActual + cantidad;

      if (nuevaCantidad < 0) {
        throw new BadRequestException('El ajuste dejaría el stock en negativo');
      }

      if (stockRow) {
        stockRow.cantidad = nuevaCantidad;
        await stockRepoTx.save(stockRow);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto,
            ubicacion,
            cantidad: nuevaCantidad,
          }),
        );
      }

      const mov = alteraRepoTx.create({
        tipo: 'AJUSTE',
        cantidad,
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
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
    }

    if (dto.origenId === dto.destinoId) {
      throw new BadRequestException('origen y destino no pueden ser iguales');
    }

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);

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

      const origenActual = stockOrigen?.cantidad ?? 0;
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

      stockOrigen!.cantidad = origenActual - cantidad;
      await stockRepoTx.save(stockOrigen!);

      if (stockDestino) {
        stockDestino.cantidad = (stockDestino.cantidad ?? 0) + cantidad;
        await stockRepoTx.save(stockDestino);
      } else {
        await stockRepoTx.save(
          stockRepoTx.create({
            producto,
            ubicacion: destino,
            cantidad,
          }),
        );
      }

      const mov = alteraRepoTx.create({
        tipo: 'TRASPASO',
        cantidad,
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
      relations: { stocks: { ubicacion: true } },
      order: { createdAt: 'DESC' },
    });

    return productos.map((p) => {
      const stocks = (p.stocks ?? []).map((s) => ({
        ubicacion: {
          id: s.ubicacion.id,
          nombre: s.ubicacion.nombre,
          tipo: s.ubicacion.tipo,
        },
        cantidad: s.cantidad ?? 0,
      }));

      const cantidadTotal = stocks.reduce((sum, s) => sum + s.cantidad, 0);

      return {
        id: p.id,
        name: p.name,
        internalCode: p.internalCode,
        barcode: p.barcode,
        unidadBase: p.unidadBase,
        isActive: p.isActive,
        stocks,
        cantidadTotal,
      };
    });
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
      cantidad: m.cantidad,
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
        const totalCantidad = group.reduce((sum, it) => sum + (it.cantidad ?? 0), 0);
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
