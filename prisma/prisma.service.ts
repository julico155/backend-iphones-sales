import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import "dotenv/config";

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  public client: PrismaClient;

  constructor() {
    const connectionString = process.env["DATABASE_URL"];

    // Validación de seguridad para confirmar que la variable no esté vacía
    if (!connectionString) {
      throw new Error('La variable de entorno DATABASE_URL no está definida.');
    }

    // Creamos el pool asegurando que el string se pase limpio
    const pool = new Pool({ 
      connectionString: connectionString 
    });
    
    const adapter = new PrismaPg(pool);
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }

  // Getters para tus servicios existentes
  get product() { return this.client.product; }
  get item() { return this.client.item; }
  get tenant() { return this.client.tenant; }
  get sale() { return this.client.sale; }
  get saleDetail() { return this.client.saleDetail; }
  get user() { return this.client.user; }
}