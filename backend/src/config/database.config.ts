import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url:
    process.env.DATABASE_URL ||
    'postgresql://username:password@localhost:5432/timemanagementelf?schema=public',
}));
