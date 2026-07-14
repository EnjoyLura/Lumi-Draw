import "reflect-metadata";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { ResponseEnvelopeInterceptor } from "./common/interceptors/response-envelope.interceptor";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true
  });
  const config = app.get(ConfigService);
  const apiPrefix = config.getOrThrow<string>("app.apiPrefix");
  const corsOrigins = config.get<string[]>("app.corsOrigins") ?? [];
  const isProduction = config.get<string>("app.nodeEnv") === "production";

  app.setGlobalPrefix(apiPrefix);
  app.enableCors({
    origin: corsOrigins.length ? corsOrigins : !isProduction,
    credentials: true
  });
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false
    })
  );
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false
    })
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());

  if (!isProduction || config.get<boolean>("app.docsEnabled")) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Lumi Draw API")
      .setDescription("露米绘画 AI 后端接口")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document);
  }

  const port = config.getOrThrow<number>("app.port");
  await app.listen(port, "0.0.0.0");
  Logger.log(`API listening on http://localhost:${port}/${apiPrefix}`, "Bootstrap");
}

void bootstrap();
