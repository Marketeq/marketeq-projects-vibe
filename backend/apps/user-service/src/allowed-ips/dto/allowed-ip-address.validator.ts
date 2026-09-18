import {
  ValidationOptions,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { parseEntry } from '../ip-range.util';

/**
 * The two shapes the IP Restrictions screen can produce: a single address, or a
 * range typed as "from - to". Both sides of a range must be the same IP
 * version, and the range has to run forwards — "203.0.113.9 - 203.0.113.4"
 * allows nothing, and silently storing it would look like a working rule.
 *
 * The parsing lives in ip-range.util so that what counts as a valid entry here
 * and what counts as covering the caller in the lockout guards can never drift
 * apart.
 */
export function isAllowedIpAddress(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (value.trim().length > 255) return false;
  return parseEntry(value) !== null;
}

export function IsAllowedIpAddress(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isAllowedIpAddress',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate: (value: unknown) => isAllowedIpAddress(value),
        defaultMessage: (args: ValidationArguments) =>
          `${args.property} must be an IP address or a range written "from - to", with both sides the same version and the range running forwards`,
      },
    });
  };
}
