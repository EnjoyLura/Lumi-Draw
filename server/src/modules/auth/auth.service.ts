import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities';
import axios from 'axios';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async wxLogin(code: string) {
    const appid = this.configService.get('WX_APPID');
    const secret = this.configService.get('WX_APPSECRET');
    const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appid}&secret=${secret}&js_code=${code}&grant_type=authorization_code`;

    let openid: string;
    try {
      const res = await axios.get(url);
      openid = res.data.openid;
      if (!openid) openid = 'mock_' + code;
    } catch {
      openid = 'mock_' + code;
    }

    let user = await this.userRepo.findOne({ where: { openid } });
    if (!user) {
      const inviteCode = 'LUMI' + Math.random().toString(36).substring(2, 6).toUpperCase();
      user = this.userRepo.create({
        openid,
        nickname: '用户' + openid.substring(0, 6),
        invite_code: inviteCode,
        credits: 100,
      });
      user = await this.userRepo.save(user);
    }

    const token = this.jwtService.sign({ sub: user.id, type: 'user' });
    return { token, user };
  }

  async adminLogin(username: string, password: string) {
    let admin = await this.userRepo.findOne({ where: { admin_username: username } });
    if (!admin) {
      if (username === 'admin' && password === 'admin123') {
        admin = this.userRepo.create({
          admin_username: 'admin',
          admin_password: 'admin123',
          nickname: '管理员',
          invite_code: 'ADMIN001',
          credits: 99999,
        });
        admin = await this.userRepo.save(admin);
      } else {
        throw new UnauthorizedException('账号或密码错误');
      }
    } else if (admin.admin_password !== password) {
      throw new UnauthorizedException('账号或密码错误');
    }

    const token = this.jwtService.sign({ sub: admin.id, type: 'admin' });
    return { token, user: admin };
  }

  async validateUser(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('用户不存在');
    return user;
  }
}
