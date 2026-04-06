import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AdminGuard } from '../../common/guards/admin.guard';
import { StorageService } from '../../storage/storage.service';
import { randomUUID } from 'crypto';

@Controller('admin/upload')
@UseGuards(AdminGuard)
export class UploadController {
  constructor(private readonly storageService: StorageService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
          return cb(new BadRequestException('仅支持上传图片文件'), false);
        }
        cb(null, true);
      },
    }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }
    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `uploads/${randomUUID()}.${ext}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    const url = this.storageService.getPublicUrl(key);
    return { url, key };
  }
}
