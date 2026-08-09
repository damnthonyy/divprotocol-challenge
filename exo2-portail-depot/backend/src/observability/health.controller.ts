import { Controller, Get } from '@nestjs/common'
import {
  HealthCheck,
  HealthCheckService,
  HealthIndicatorService,
  type HealthCheckResult,
  type HealthIndicatorResult,
} from '@nestjs/terminus'

import { PrismaService } from '@/prisma/prisma.service'
import { S3Service } from '@/storage/s3.service'

@Controller()
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly indicator: HealthIndicatorService,
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  /**
   * Sonde consommee par les healthchecks Compose et par le reverse proxy.
   *
   * Les deux dependances reellement necessaires au service sont verifiees :
   * une API qui repond alors que le stockage objet est injoignable accepterait
   * des depots qu'elle ne peut pas honorer.
   */
  @Get('health')
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    return this.health.check([() => this.checkDatabase(), () => this.checkStorage()])
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    const check = this.indicator.check('database')
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return check.up()
    } catch (error) {
      return check.down({ message: String(error) })
    }
  }

  private async checkStorage(): Promise<HealthIndicatorResult> {
    const check = this.indicator.check('object-storage')
    try {
      await this.s3.ping()
      return check.up()
    } catch (error) {
      return check.down({ message: String(error) })
    }
  }
}
