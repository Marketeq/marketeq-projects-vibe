import { Controller, Get } from '@nestjs/common';

const TOOLTIPS: Record<string, string> = {
  howTimeCalculated:
    'Time is calculated from the first to the last screenshot in each active window. Gaps longer than 10 minutes are excluded.',
  deletionReason:
    'Screenshots can be deleted if they show sensitive information or were captured in error. Deleted screenshots are non-billable by default.',
  blurReason:
    'Blurring hides the screenshot content from the client while keeping it billable. Admin approval may be required.',
  keyboardActivity:
    'Percentage of total activity attributed to keyboard input during the screenshot interval.',
  mouseActivity:
    'Percentage of total activity attributed to mouse movement and clicks during the screenshot interval.',
  manualTimePending:
    'This time entry has been submitted and is awaiting admin review. It will not appear in billing totals until approved.',
  manualTimeRejected:
    'This time entry was rejected by an admin. The rejection reason is shown below the entry.',
  blurredBillable:
    'Blurred screenshots are currently configured as billable. Contact your admin to change this setting.',
  deletedNonBillable:
    'Deleted screenshots are non-billable. The hours associated with these screenshots will not appear in your invoice.',
};

@Controller('metadata')
export class MetadataController {
  @Get('tooltips')
  getTooltips() {
    return TOOLTIPS;
  }
}
