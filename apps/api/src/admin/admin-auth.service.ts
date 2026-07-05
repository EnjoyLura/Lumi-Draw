import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { verifyPassword } from "../common/crypto/password";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AdminAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService
  ) {}

  async login(username: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { username } });
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
      throw new UnauthorizedException("账号或密码错误");
    }
    const expiresIn = 8 * 3600;
    const accessToken = this.jwt.sign(
      { sub: admin.id, type: "admin", role: admin.role },
      { secret: this.config.getOrThrow<string>("app.adminJwtSecret"), expiresIn }
    );
    return {
      accessToken,
      expiresIn,
      admin: { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role }
    };
  }

  async me(adminId: number) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id: adminId } });
    if (!admin) throw new UnauthorizedException("管理员不存在");
    return { id: admin.id, username: admin.username, nickname: admin.nickname, role: admin.role };
  }
}
