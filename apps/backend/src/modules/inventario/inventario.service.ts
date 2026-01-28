import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { AlteraEntity } from './entities/altera.entity';
import { ProductoEntity } from '../productos/entities/producto.entity';
import { UbicacionEntity } from '../ubicaciones/entities/ubicacion.entity';
import { ProductoStockEntity } from '../productos/entities/producto-stock.entity';
import { UserEntity } from '../users/entities/user.entity';
import { CreateIngresoDto } from './dto/create-ingreso.dto';
import { CreateAjusteDto } from './dto/create-ajuste.dto';
import { CreateTraspasoDto } from './dto/create-traspaso.dto';
import { InventarioDocumentoEntity } from './entities/inventario-documento.entity';
import { InventarioDocumentoItemEntity } from './entities/inventario-documento-item.entity';
import { CreateDocumentoIngresoDto } from './dto/create-documento-ingreso.dto';
import { CreateDocumentoTraspasoDto } from './dto/create-documento-traspaso.dto';
import { AddDocumentoItemDto } from './dto/add-documento-item.dto';
import { UpdateDocumentoItemDto } from './dto/update-documento-item.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { ConfirmDocumentoIngresoDto } from './dto/confirm-documento-ingreso.dto';
import { ConfirmDocumentoTraspasoDto } from './dto/confirm-documento-traspaso.dto';

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
    @InjectRepository(InventarioDocumentoEntity)
    private readonly docRepo: Repository<InventarioDocumentoEntity>,
    @InjectRepository(InventarioDocumentoItemEntity)
    private readonly itemRepo: Repository<InventarioDocumentoItemEntity>,
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

  private async getStockRow(productoId: string, ubicacionId: string) {
    const existing = await this.stockRepo.findOne({
      where: {
        producto: { id: productoId },
        ubicacion: { id: ubicacionId },
      } as any,
      relations: { producto: true, ubicacion: true },
    });

    if (existing) return existing;

    const producto = await this.getProductoOrThrow(productoId);
    const ubicacion = await this.getUbicacionOrThrow(ubicacionId);

    return this.stockRepo.create({
      producto,
      ubicacion,
      cantidad: 0,
    });
  }

  private async getDocumentoOrThrow(id: number) {
    const doc = await this.docRepo.findOne({
      where: { id },
      relations: { items: { producto: true }, origen: true, destino: true, usuario: true },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  private assertBorrador(doc: InventarioDocumentoEntity) {
    if (doc.estado !== 'BORRADOR') {
      throw new BadRequestException('El documento no está en borrador');
    }
  }

  async crearDocumentoIngreso(dto: CreateDocumentoIngresoDto, usuarioId: string) {
    const destino = await this.getUbicacionOrThrow(dto.destinoId);

    const doc = this.docRepo.create({
      tipo: 'INGRESO',
      estado: 'BORRADOR',
      origen: null,
      destino,
      usuario: { idUsuario: usuarioId } as UserEntity,
      fechaConfirmacion: null,
    });

    return this.docRepo.save(doc);
  }

  async crearDocumentoTraspaso(dto: CreateDocumentoTraspasoDto, usuarioId: string) {
    if (dto.origenId === dto.destinoId) {
      throw new BadRequestException('origen y destino no pueden ser iguales');
    }

    const origen = await this.getUbicacionOrThrow(dto.origenId);
    const destino = await this.getUbicacionOrThrow(dto.destinoId);

    const doc = this.docRepo.create({
      tipo: 'TRASPASO',
      estado: 'BORRADOR',
      origen,
      destino,
      usuario: { idUsuario: usuarioId } as UserEntity,
      fechaConfirmacion: null,
    });

    return this.docRepo.save(doc);
  }

  async actualizarDocumento(id: number, dto: UpdateDocumentoDto) {
    const doc = await this.getDocumentoOrThrow(id);
    this.assertBorrador(doc);

    if (dto.origenId !== undefined) {
      doc.origen = dto.origenId ? await this.getUbicacionOrThrow(dto.origenId) : null;
    }

    if (dto.destinoId !== undefined) {
      doc.destino = dto.destinoId ? await this.getUbicacionOrThrow(dto.destinoId) : null;
    }

    return this.docRepo.save(doc);
  }

  async agregarItemDocumento(id: number, dto: AddDocumentoItemDto) {
    const doc = await this.getDocumentoOrThrow(id);
    this.assertBorrador(doc);

    const cantidad = Number(dto.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
    }

    const producto = await this.getProductoOrThrow(dto.productoId);

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .insert()
        .into(InventarioDocumentoItemEntity)
        .values({
          documento: { id: doc.id } as any,
          producto: { id: producto.id } as any,
          cantidad,
          unidadBase: producto.unidadBase ?? null,
          barcode: producto.barcode ?? null,
        })
        .onConflict(`("id_documento", "id_producto") DO UPDATE SET
          cantidad = "inventario_documento_item"."cantidad" + EXCLUDED."cantidad",
          unidad_base = EXCLUDED."unidad_base",
          barcode = EXCLUDED."barcode"`)
        .execute();
    });

    return this.getDocumentoOrThrow(id);
  }

  async actualizarItemDocumento(id: number, itemId: number, dto: UpdateDocumentoItemDto) {
    const doc = await this.getDocumentoOrThrow(id);
    this.assertBorrador(doc);

    const cantidad = Number(dto.cantidad);
    if (!Number.isInteger(cantidad) || cantidad < 1) {
      throw new BadRequestException('cantidad debe ser entero >= 1');
    }

    const item = await this.itemRepo.findOne({
      where: { id: itemId, documento: { id: doc.id } as any } as any,
    });
    if (!item) throw new NotFoundException('Item no encontrado');

    item.cantidad = cantidad;
    await this.itemRepo.save(item);
    return this.getDocumentoOrThrow(id);
  }

  async eliminarItemDocumento(id: number, itemId: number) {
    const doc = await this.getDocumentoOrThrow(id);
    this.assertBorrador(doc);

    const item = await this.itemRepo.findOne({
      where: { id: itemId, documento: { id: doc.id } as any } as any,
    });
    if (!item) throw new NotFoundException('Item no encontrado');

    await this.itemRepo.remove(item);
    return this.getDocumentoOrThrow(id);
  }

  async confirmarDocumento(id: number, usuarioId: string) {
    const doc = await this.getDocumentoOrThrow(id);
    this.assertBorrador(doc);

    if (!doc.items || doc.items.length === 0) {
      throw new BadRequestException('El documento no tiene items');
    }

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const docRepoTx = manager.getRepository(InventarioDocumentoEntity);

      if (doc.tipo === 'INGRESO') {
        if (!doc.destino) throw new BadRequestException('Destino requerido');

        for (const item of doc.items) {
          const stock = await stockRepoTx.findOne({
            where: {
              producto: { id: item.producto.id },
              ubicacion: { id: doc.destino.id },
            } as any,
          });

          if (stock) {
            stock.cantidad = (stock.cantidad ?? 0) + item.cantidad;
            await stockRepoTx.save(stock);
          } else {
            await stockRepoTx.save(
              stockRepoTx.create({
                producto: { id: item.producto.id } as any,
                ubicacion: { id: doc.destino.id } as any,
                cantidad: item.cantidad,
              }),
            );
          }

          await alteraRepoTx.save(
            alteraRepoTx.create({
              tipo: 'INGRESO',
              cantidad: item.cantidad,
              motivo: null,
              producto: { id: item.producto.id } as any,
              ubicacion: { id: doc.destino.id } as any,
              origen: null,
              destino: null,
              usuario: { idUsuario: usuarioId } as UserEntity,
              documento: { id: doc.id } as any,
            }),
          );
        }
      } else if (doc.tipo === 'TRASPASO') {
        if (!doc.origen || !doc.destino) throw new BadRequestException('Origen y destino requeridos');

        for (const item of doc.items) {
          const stockOrigen = await stockRepoTx.findOne({
            where: {
              producto: { id: item.producto.id },
              ubicacion: { id: doc.origen.id },
            } as any,
          });

          const origenActual = stockOrigen?.cantidad ?? 0;
          if (origenActual < item.cantidad) {
            throw new BadRequestException('Stock insuficiente en ubicación origen');
          }

          stockOrigen!.cantidad = origenActual - item.cantidad;
          await stockRepoTx.save(stockOrigen!);

          const stockDestino = await stockRepoTx.findOne({
            where: {
              producto: { id: item.producto.id },
              ubicacion: { id: doc.destino.id },
            } as any,
          });

          if (stockDestino) {
            stockDestino.cantidad = (stockDestino.cantidad ?? 0) + item.cantidad;
            await stockRepoTx.save(stockDestino);
          } else {
            await stockRepoTx.save(
              stockRepoTx.create({
                producto: { id: item.producto.id } as any,
                ubicacion: { id: doc.destino.id } as any,
                cantidad: item.cantidad,
              }),
            );
          }

          await alteraRepoTx.save(
            alteraRepoTx.create({
              tipo: 'TRASPASO',
              cantidad: item.cantidad,
              motivo: null,
              producto: { id: item.producto.id } as any,
              ubicacion: null,
              origen: { id: doc.origen.id } as any,
              destino: { id: doc.destino.id } as any,
              usuario: { idUsuario: usuarioId } as UserEntity,
              documento: { id: doc.id } as any,
            }),
          );
        }
      }

      doc.estado = 'CONFIRMADO';
      doc.fechaConfirmacion = new Date();
      await docRepoTx.save(doc);

      const docFull = await docRepoTx.findOne({
        where: { id: doc.id },
        relations: { items: { producto: true }, origen: true, destino: true, usuario: true },
      });
      if (!docFull) throw new NotFoundException('Documento no encontrado');
      return docFull;
    });
  }

  async confirmarDocumentoIngreso(dto: ConfirmDocumentoIngresoDto, usuarioId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento no tiene items');
    }

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const docRepoTx = manager.getRepository(InventarioDocumentoEntity);
      const itemRepoTx = manager.getRepository(InventarioDocumentoItemEntity);

      const destino = await this.getUbicacionOrThrow(dto.destinoId);

      const doc = await docRepoTx.save(
        docRepoTx.create({
          tipo: 'INGRESO',
          estado: 'CONFIRMADO',
          origen: null,
          destino,
          usuario: { idUsuario: usuarioId } as UserEntity,
          fechaConfirmacion: new Date(),
        }),
      );

      for (const it of dto.items) {
        const producto = await this.getProductoOrThrow(it.productoId);
        const cantidad = Number(it.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
          throw new BadRequestException('cantidad debe ser entero >= 1');
        }

        await itemRepoTx.save(
          itemRepoTx.create({
            documento: { id: doc.id } as any,
            producto: { id: producto.id } as any,
            cantidad,
            unidadBase: producto.unidadBase ?? null,
            barcode: producto.barcode ?? null,
          }),
        );

        const stock = await stockRepoTx.findOne({
          where: {
            producto: { id: producto.id },
            ubicacion: { id: destino.id },
          } as any,
        });

        if (stock) {
          stock.cantidad = (stock.cantidad ?? 0) + cantidad;
          await stockRepoTx.save(stock);
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
            documento: { id: doc.id } as any,
          }),
        );
      }

      const docFull = await docRepoTx.findOne({
        where: { id: doc.id },
        relations: { items: { producto: true }, origen: true, destino: true, usuario: true },
      });
      if (!docFull) throw new NotFoundException('Documento no encontrado');
      return docFull;
    });
  }

  async confirmarDocumentoTraspaso(dto: ConfirmDocumentoTraspasoDto, usuarioId: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('El documento no tiene items');
    }

    if (dto.origenId === dto.destinoId) {
      throw new BadRequestException('origen y destino no pueden ser iguales');
    }

    return this.dataSource.transaction(async (manager) => {
      const stockRepoTx = manager.getRepository(ProductoStockEntity);
      const alteraRepoTx = manager.getRepository(AlteraEntity);
      const docRepoTx = manager.getRepository(InventarioDocumentoEntity);
      const itemRepoTx = manager.getRepository(InventarioDocumentoItemEntity);

      const origen = await this.getUbicacionOrThrow(dto.origenId);
      const destino = await this.getUbicacionOrThrow(dto.destinoId);

      const doc = await docRepoTx.save(
        docRepoTx.create({
          tipo: 'TRASPASO',
          estado: 'CONFIRMADO',
          origen,
          destino,
          usuario: { idUsuario: usuarioId } as UserEntity,
          fechaConfirmacion: new Date(),
        }),
      );

      for (const it of dto.items) {
        const producto = await this.getProductoOrThrow(it.productoId);
        const cantidad = Number(it.cantidad);
        if (!Number.isInteger(cantidad) || cantidad < 1) {
          throw new BadRequestException('cantidad debe ser entero >= 1');
        }

        await itemRepoTx.save(
          itemRepoTx.create({
            documento: { id: doc.id } as any,
            producto: { id: producto.id } as any,
            cantidad,
            unidadBase: producto.unidadBase ?? null,
            barcode: producto.barcode ?? null,
          }),
        );

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
            documento: { id: doc.id } as any,
          }),
        );
      }

      const docFull = await docRepoTx.findOne({
        where: { id: doc.id },
        relations: { items: { producto: true }, origen: true, destino: true, usuario: true },
      });
      if (!docFull) throw new NotFoundException('Documento no encontrado');
      return docFull;
    });
  }

  async obtenerDocumento(id: number) {
    return this.getDocumentoOrThrow(id);
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
        documento: true,
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
      documento: m.documento
        ? { id: m.documento.id, tipo: m.documento.tipo }
        : null,
    }));
  }

  async listarDocumentos(limit = 200) {
    const take = Math.min(Math.max(Number(limit) || 200, 1), 500);

    const docs = await this.docRepo.find({
      relations: { items: true, origen: true, destino: true, usuario: true },
      order: { fechaCreacion: 'DESC' },
      take,
    });

    return docs.map((d) => {
      const items = d.items ?? [];
      const itemsCount = items.length;
      const totalCantidad = items.reduce((sum, it) => sum + (it.cantidad ?? 0), 0);

      return {
        id: d.id,
        tipo: d.tipo,
        estado: d.estado,
        origen: d.origen ? { id: d.origen.id, nombre: d.origen.nombre, tipo: d.origen.tipo } : null,
        destino: d.destino ? { id: d.destino.id, nombre: d.destino.nombre, tipo: d.destino.tipo } : null,
        usuario: d.usuario ? { id: d.usuario.idUsuario, email: d.usuario.email } : null,
        fechaCreacion: d.fechaCreacion,
        fechaConfirmacion: d.fechaConfirmacion,
        itemsCount,
        totalCantidad,
      };
    });
  }
}
