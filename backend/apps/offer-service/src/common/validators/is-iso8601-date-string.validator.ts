// apps/offer-service/src/common/validators/is-iso8601-date-string.validator.ts
// OS-11: Validates a YYYY-MM-DD string. Rejects invalid calendar dates (e.g. Feb 30)
// and full ISO 8601 datetimes (no T or Z suffix).
import {
  registerDecorator, ValidationOptions, ValidatorConstraint,
  ValidatorConstraintInterface, ValidationArguments,
} from 'class-validator';

const ISO_DATE_REGEX = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

@ValidatorConstraint({ name: 'IsIso8601DateString', async: false })
export class IsIso8601DateStringConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (!ISO_DATE_REGEX.test(value)) return false;
    // Catch overflows like Feb 30 that pass the regex
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }
  defaultMessage(_args: ValidationArguments): string {
    return 'startDate must be a valid date in YYYY-MM-DD format (e.g. 2025-01-30).';
  }
}

export function IsIso8601DateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsIso8601DateStringConstraint,
    });
  };
}