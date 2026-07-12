export class ValidationError extends Error {
    constructor(public fields: Record<string, string[]>) {
        super('Validation failed');
        this.name = 'ValidationError';
    }
}

/**
 * Тип функции-валидатора. Возвращает строку с ошибкой или null, если ошибок нет.
 */
export type ValidatorRule = (value: any) => string | null;

// ====================================================================
//  Встроенные правила валидации
// ====================================================================

export const Required = (message: string = 'Поле обязательно для заполнения'): ValidatorRule => {
    return (value: any) => {
        if (value === undefined || value === null || value === '') {
            return message;
        }
        return null;
    };
};

export const MaxLength = (max: number, message?: string): ValidatorRule => {
    return (value: any) => {
        if (typeof value === 'string' && value.length > max) {
            return message || `Длина не должна превышать ${max} символов`;
        }
        return null;
    };
};

export const MinLength = (min: number, message?: string): ValidatorRule => {
    return (value: any) => {
        if (typeof value === 'string' && value.length < min) {
            return message || `Длина должна быть не менее ${min} символов`;
        }
        return null;
    };
};

export const IsEmail = (message: string = 'Некорректный email адрес'): ValidatorRule => {
    return (value: any) => {
        if (typeof value === 'string' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                return message;
            }
        }
        return null;
    };
};

export const IsNumber = (message: string = 'Значение должно быть числом'): ValidatorRule => {
    return (value: any) => {
        if (value !== undefined && value !== null && value !== '') {
            if (isNaN(Number(value))) {
                return message;
            }
        }
        return null;
    };
};

// ====================================================================
//  Функция применения правил валидации
// ====================================================================

/**
 * Применяет набор правил к объекту с данными.
 * 
 * @example
 * ```typescript
 * const errors = validate(req.body, {
 *     name: [Required(), MinLength(3)],
 *     email: [Required(), IsEmail()]
 * });
 * if (errors) throw errors; // instanceof ValidationError
 * ```
 * 
 * @param data Данные для проверки (обычно req.body)
 * @param rules Объект с правилами для каждого поля
 * @returns ValidationError объект с ошибками или null, если валидация пройдена
 */
export function validate<T extends Record<string, any>>(
    data: T, 
    rules: Partial<Record<keyof T, ValidatorRule[]>>
): ValidationError | null {
    const errors: Record<string, string[]> = {};
    
    for (const [field, validators] of Object.entries(rules)) {
        const value = data[field as keyof T];
        
        for (const validator of (validators as ValidatorRule[])) {
            const error = validator(value);
            if (error) {
                if (!errors[field]) errors[field] = [];
                errors[field].push(error);
            }
        }
    }
    
    return Object.keys(errors).length > 0 ? new ValidationError(errors) : null;
}
