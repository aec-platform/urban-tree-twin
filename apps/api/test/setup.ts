// Minimal env required by config.ts so importing services/risk doesn't crash
// the test runner. Real integration tests should override these via .env.test.
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://utt:utt_dev_password@localhost:5432/urban_tree_twin?schema=public';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379/0';
process.env.S3_ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:9000';
process.env.S3_REGION = process.env.S3_REGION ?? 'ap-southeast-1';
process.env.S3_BUCKET = process.env.S3_BUCKET ?? 'utt-uploads';
process.env.S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? 'minioadmin';
process.env.S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? 'minioadmin';
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-jwt-secret-must-be-32-chars-or-more!!';
process.env.PASSWORD_PEPPER = process.env.PASSWORD_PEPPER ?? 'test-pepper';
