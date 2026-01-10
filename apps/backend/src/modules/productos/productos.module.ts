import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductoEntity } from './entities/producto.entity';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProductoEntity])],
  controllers: [ProductosController],
  providers: [ProductosService],
})
export class ProductosModule {}
