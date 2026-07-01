// apps/offer-service/src/common/validators/is-not-too-far-future.validator.ts
// OS-11: Validates a YYYY-MM-DD string is no more than MAX_START_DATE_YEARS_OUT years out.
import {
  registerDecorator, ValidationOptions, ValidatorConstraint,
  ValidatorConstraintInterface, ValidationArguments,
} from 'class-validator';
import { MAX_START_DATE_YEARS_OUT } from '../constants/offer.constants';

@ValidatorConstraint({ name: 'IsNotTooFarFuture', async: false })
export class IsNotTooFarFutureConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const inputDate = new Date(year, month - 1, day);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + MAX_START_DATE_YEARS_OUT);
    return inputDate <= maxDate;
  }
  defaultMessage(_args: ValidationArguments): string {
    return `startDate cannot be more than ${MAX_START_DATE_YEARS_OUT} years in the future.`;
  }
}

export function IsNotTooFarFuture(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotTooFarFutureConstraint,
    });
  };
}