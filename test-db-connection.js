// Test database connection
const postgres = require('postgres');
const { config } = require('dotenv');

config();

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL not found in environment variables');
      return;
    }
    
    console.log('DATABASE_URL exists:', process.env.DATABASE_URL.substring(0, 20) + '...');
    
    const sql = postgres(process.env.DATABASE_URL, {
      ssl: { rejectUnauthorized: false }
    });
    
    // Test basic connection
    const result = await sql`SELECT 1 as test`;
    console.log('Connection successful:', result);
    
    // Check if tables exist
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('Existing tables:', tables.map(t => t.table_name));
    
    await sql.end();
    
  } catch (error) {
    console.error('Database connection error:', error.message);
  }
}

testConnection();
