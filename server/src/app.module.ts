import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WorkModule } from './modules/work/work.module';
import { GenerateModule } from './modules/generate/generate.module';
import { PaymentModule } from './modules/payment/payment.module';
import { AdminModule } from './modules/admin/admin.module';
import { OssModule } from './modules/oss/oss.module';
import { NotificationModule } from './modules/notification/notification.module';
import { ConfigModule as AppConfigModule } from './modules/config/config.module';
import { CheckinModule } from './modules/checkin/checkin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        type: 'postgres',
        host: cs.get('DB_HOST'),
        port: cs.get<number>('DB_PORT'),
        username: cs.get('DB_USERNAME'),
        password: cs.get('DB_PASSWORD'),
        database: cs.get('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: true,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        redis: { host: cs.get('REDIS_HOST'), port: cs.get<number>('REDIS_PORT') },
      }),
    }),
    AuthModule,
    UserModule,
    WorkModule,
    AppConfigModule,
    CheckinModule,
    GenerateModule,
    PaymentModule,
    NotificationModule,
    AdminModule,
    OssModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
