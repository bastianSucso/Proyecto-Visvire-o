import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecetaEntity } from './entities/receta.entity';
import { ProductoEntity } from './entities/producto.entity';
import { ProductoTipoEntity, ProductoTipoEnum } from './entities/producto-tipo.entity';
import { CreateRecetaDto } from './dto/create-receta.dto';
import { UpdateRecetaDto } from './dto/update-receta.dto';

@Injectable()
export class RecetasService {
  constructor(
    @InjectRepository(RecetaEntity)
    private readonly recetaRepo: Repository<RecetaEntity>,
    @InjectRepository(ProductoEntity)
    private readonly productoRepo: Repository<ProductoEntity>,
    @InjectRepository(ProductoTipoEntity)
    private readonly tipoRepo: Repository<ProductoTipoEntity>,
  ) {}

  private async assertTipo(productoId: string, tipo: ProductoTipoEnum) {
    const exists = await this.tipoRepo.findOne({
      where: { producto: { id: productoId } as any, tipo } as any,
    });
    if (!exists) throw new ConflictException(`Producto no tiene tipo ${tipo}`);
  }

  async list(comidaId: string) {
    if (!comidaId) throw new BadRequestException('comidaId es requerido');

    await this.assertTipo(comidaId, ProductoTipoEnum.COMIDA);

    const rows = await this.recetaRepo.find({
      where: { comida: { id: comidaId } as any },
      relations: { insumo: true, comida: true },
      order: { id: 'ASC' },
    });

    return rows.map((r) => ({
      id: r.id,
      cantidadBase: r.cantidadBase,
      comida: r.comida
        ? {
            id: r.comida.id,
            name: r.comida.name,
            unidadBase: r.comida.unidadBase ?? null,
            rendimiento: r.comida.rendimiento ?? null,
          }
        : null,
      insumo: r.insumo
        ? {
            id: r.insumo.id,
            name: r.insumo.name,
            unidadBase: r.insumo.unidadBase ?? null,
            precioCosto: r.insumo.precioCosto,
          }
        : null,
    }));
  }

  async create(dto: CreateRecetaDto) {
    await this.assertTipo(dto.comidaId, ProductoTipoEnum.COMIDA);
    await this.assertTipo(dto.insumoId, ProductoTipoEnum.INSUMO);

    const comida = await this.productoRepo.findOne({ where: { id: dto.comidaId } });
    if (!comida) throw new NotFoundException('Comida no encontrada');

    const insumo = await this.productoRepo.findOne({ where: { id: dto.insumoId } });
    if (!insumo) throw new NotFoundException('Insumo no encontrado');

    const dup = await this.recetaRepo.findOne({
      where: { comida: { id: dto.comidaId } as any, insumo: { id: dto.insumoId } as any },
    });
    if (dup) throw new ConflictException('El insumo ya está en la receta');

    const entity = this.recetaRepo.create({
      comida,
      insumo,
      cantidadBase: dto.cantidadBase.toFixed(3),
    });

    return this.recetaRepo.save(entity);
  }

  async update(id: number, dto: UpdateRecetaDto) {
    const receta = await this.recetaRepo.findOne({ where: { id } });
    if (!receta) throw new NotFoundException('Receta no encontrada');

    if (dto.cantidadBase !== undefined) {
      receta.cantidadBase = dto.cantidadBase.toFixed(3);
    }

    return this.recetaRepo.save(receta);
  }

  async remove(id: number) {
    const receta = await this.recetaRepo.findOne({ where: { id } });
    if (!receta) throw new NotFoundException('Receta no encontrada');
    await this.recetaRepo.remove(receta);
    return { ok: true };
  }

  async costos(comidaId: string) {
    if (!comidaId) throw new BadRequestException('comidaId es requerido');
    await this.assertTipo(comidaId, ProductoTipoEnum.COMIDA);

    const comida = await this.productoRepo.findOne({ where: { id: comidaId } });
    if (!comida) throw new NotFoundException('Comida no encontrada');

    const rows = await this.recetaRepo.find({
      where: { comida: { id: comidaId } as any },
      relations: { insumo: true },
      order: { id: 'ASC' },
    });

    const items = rows.map((r) => {
      const costoUnitario = Number(r.insumo?.precioCosto ?? 0);
      const cantidad = Number(r.cantidadBase ?? 0);
      const subtotal = costoUnitario * cantidad;

      return {
        id: r.id,
        insumo: r.insumo
          ? {
              id: r.insumo.id,
              name: r.insumo.name,
              unidadBase: r.insumo.unidadBase ?? null,
              precioCosto: r.insumo.precioCosto,
            }
          : null,
        cantidadBase: r.cantidadBase,
        costoUnitario: costoUnitario.toFixed(2),
        subtotal: subtotal.toFixed(2),
      };
    });

    const total = items.reduce((sum, it) => sum + Number(it.subtotal ?? 0), 0);
    const rendimiento = Number(comida.rendimiento ?? 0);
    const costoPorcion = rendimiento > 0 ? total / rendimiento : null;

    return {
      comida: {
        id: comida.id,
        name: comida.name,
        unidadBase: comida.unidadBase ?? null,
        rendimiento: comida.rendimiento ?? null,
      },
      totalCosto: total.toFixed(2),
      rendimiento: comida.rendimiento ?? null,
      costoPorcion: costoPorcion !== null ? costoPorcion.toFixed(2) : null,
      items,
    };
  }
}
