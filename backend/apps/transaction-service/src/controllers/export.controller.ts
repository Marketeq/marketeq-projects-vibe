import { Controller } from '@nestjs/common';

@Controller()
export class ExportController {
  // Export endpoints are handled by TransactionController at POST /transactions/export
  // This controller is reserved for future standalone export endpoints in Doc 05
}