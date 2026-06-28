import { Controller } from '@nestjs/common';
import { WorkService } from './work.service';

@Controller('works')
export class WorkController {
  constructor(private readonly workService: WorkService) {}
}
