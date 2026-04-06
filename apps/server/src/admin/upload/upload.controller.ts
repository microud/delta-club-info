import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop() || 'bin';
    const key = `uploads/${randomUUID()}.${ext}`;
    await this.storageService.upload(key, file.buffer, file.mimetype);
    const url = this.storageService.getPublicUrl(key);
    return { url, key };
  }
}
