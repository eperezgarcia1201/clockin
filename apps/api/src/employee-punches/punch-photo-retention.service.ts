import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const PUNCH_PHOTO_RETENTION_DAYS = 15;
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class PunchPhotoRetentionService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PunchPhotoRetentionService.name);
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.cleanupExpiredPunchPhotos();
    this.cleanupTimer = setInterval(() => {
      void this.cleanupExpiredPunchPhotos();
    }, CLEANUP_INTERVAL_MS);
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  async cleanupExpiredPunchPhotos(referenceDate = new Date()) {
    const cutoff = new Date(
      referenceDate.getTime() - PUNCH_PHOTO_RETENTION_DAYS * CLEANUP_INTERVAL_MS,
    );

    const result = await this.prisma.employeePunch.updateMany({
      where: {
        photoCapturedAt: {
          lt: cutoff,
        },
        photoMimeType: {
          not: null,
        },
      },
      data: {
        photoData: null,
        photoMimeType: null,
        photoCapturedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Deleted ${result.count} expired punch photo(s) older than ${PUNCH_PHOTO_RETENTION_DAYS} days.`,
      );
    }

    return result.count;
  }
}
