import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tooltip } from './tooltip.entity';
import { SettingsService } from '../services/settings.service';

@Injectable()
export class TooltipsService {
  constructor(
    @InjectRepository(Tooltip)
    private readonly repo: Repository<Tooltip>,
    private readonly settingsService: SettingsService,
  ) {}

  async getAll(scopeId: string, userId: string): Promise<Record<string, string>> {
    const baseTooltips = await this.repo.find();

    const map: Record<string, string> = {};
    for (const t of baseTooltips) {
      map[t.key] = t.text;
    }

    // Dynamic billing tooltips from admin settings
    const settings = await this.settingsService.getAdminSettings(scopeId);
    map['blurredBilling'] = settings.blurredBillable
      ? 'Blurred screenshots are billable.'
      : 'Blurred screenshots are not billable.';
    map['deletedBilling'] = settings.deletedNonBillable
      ? 'Deleted screenshots are not billable.'
      : 'Deleted screenshots remain billable.';

    // Dynamic timezone info from user preferences
    const prefs = await this.settingsService.getUserPreferences(userId);
    map['timezoneInfo'] = `Current timezone: ${prefs.timezone}`;

    // Static fallbacks
    map['timeCalculation'] =
      map['timeCalculation'] ??
      'We calculate your activity using mouse and keyboard input during tracked hours. Screenshots are taken every 10 minutes to match the activity score.';
    map['deleteReason'] =
      map['deleteReason'] ?? 'This helps us understand why screenshots are being deleted.';
    map['noActivity'] =
      map['noActivity'] ?? 'No mouse or keyboard activity was detected during this period.';
    map['manualTime'] =
      map['manualTime'] ?? 'This time was manually added and not tracked via the app.';

    return map;
  }
}
