import * as path from 'path';
import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { typeOrmConfig } from './typeorm.config';

dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? path.resolve(process.cwd(), '../../.env.prod')
    : path.resolve(process.cwd(), '../../.env.dev'),
});

export const AppDataSource = new DataSource(typeOrmConfig());
