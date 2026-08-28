import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { Matches } from 'class-validator';

/**
 * A company name that is really an email address is always a mis-fill: the
 * company pickers put the "Register a company with this name" row directly
 * under a free-text field, so an address typed there (meaning to invite that
 * person) used to be saved as a company and then showed up in everyone's
 * company dropdown. Rejected at the DTO so no caller can record one.
 *
 * The value is trimmed first, because the service trims before saving, so the check
 * has to see the same string it will store, or " a@b.com " slips through.
 *
 * The first letter is then capitalized so every company is stored with a
 * consistent, presentable name. This is the only place a company name is
 * written (create and update both go through this decorator), so every
 * reader (pickers, dropdowns, the my-team roster, invite emails) sees the
 * capitalized form without needing its own formatting.
 */
export const IsCompanyName = () =>
  applyDecorators(
    Transform(({ value }) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      return trimmed.length ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : trimmed;
    }),
    Matches(/^(?![^\s@]+@[^\s@]+\.[^\s@]+$).+$/, {
      message: 'name must be a company name, not an email address',
    }),
  );
