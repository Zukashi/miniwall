// Load env vars before any module under test is imported
process.env['NODE_ENV'] = 'test';
process.env['JWT_SECRET'] = 'test_secret_do_not_use_in_prod';
process.env['JWT_EXPIRES_IN'] = '1h';
