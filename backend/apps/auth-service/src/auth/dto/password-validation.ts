import { Matches, MinLength } from 'class-validator';

export const StrongPassword = () => {
  return (target: object, propertyKey: string) => {
    MinLength(8, { message: 'Password must be at least 8 characters' })(
      target,
      propertyKey,
    );
    Matches(/[a-z]/, {
      message: 'Password must contain at least one lowercase letter',
    })(target, propertyKey);
    Matches(/[A-Z]/, {
      message: 'Password must contain at least one uppercase letter',
    })(target, propertyKey);
    Matches(/\d/, {
      message: 'Password must contain at least one number',
    })(target, propertyKey);
    Matches(/[^a-zA-Z0-9]/, {
      message: 'Password must contain at least one special character',
    })(target, propertyKey);
  };
};
