import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
 
type RequestLike = { ip?: string; body?: { email?: unknown } };
 
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Record<string, any>): Promise<string> {
    const { ip, body } = req as RequestLike;
    const email =
      typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
 
    return email ? `${ip}|${email}` : String(ip);
  }
}
 