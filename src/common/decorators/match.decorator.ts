// src/common/decorators/match.decorator.ts
import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

// Valida que a propriedade decorada é igual a outra propriedade do mesmo objeto
export function Match(property: string, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'match',
      target: object.constructor,
      propertyName,
      constraints: [property],
      options: {
        message: `${propertyName} must match ${property}`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const [relatedProperty] = args.constraints as [string];
          const relatedValue = (args.object as Record<string, unknown>)[
            relatedProperty
          ];
          return value === relatedValue;
        },
      },
    });
  };
}