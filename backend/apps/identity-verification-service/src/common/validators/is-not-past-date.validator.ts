import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsNotPastDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNotPastDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown, _args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          const inputDate = new Date(value + 'T00:00:00Z');
          if (Number.isNaN(inputDate.getTime())) return false;
          const todayUtc = new Date();
          const todayMidnightUtc = new Date(Date.UTC(
            todayUtc.getUTCFullYear(), todayUtc.getUTCMonth(), todayUtc.getUTCDate(),
          ));
          return inputDate.getTime() >= todayMidnightUtc.getTime();
        },
        defaultMessage(_args: ValidationArguments) {
          return 'expirationDate must not be in the past';
        },
      },
    });
  };
}
