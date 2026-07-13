// В будущем здесь будут загружаться переменные из .env
export const config = {
    PORT: Number(process.env.PORT) || 8080,
    DATABASE_URL: process.env.DATABASE_URL || 'patterns.sqlite',
    NODE_ENV: process.env.NODE_ENV || 'development'
};
