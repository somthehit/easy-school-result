// Debug script to check classes in database
const { db, tables } = require('./src/db/client.ts');
const { eq } = require('drizzle-orm');

async function debugClasses() {
  try {
    console.log('Fetching all classes from database...');
    const allClasses = await db.select().from(tables.classes);
    
    console.log('Total classes found:', allClasses.length);
    console.log('Classes data:');
    allClasses.forEach((cls, index) => {
      console.log(`${index + 1}. ID: ${cls.id}`);
      console.log(`   Name: "${cls.name}"`);
      console.log(`   Section: "${cls.section}" (type: ${typeof cls.section})`);
      console.log(`   Year: ${cls.year}`);
      console.log(`   UserID: ${cls.userId}`);
      console.log('   ---');
    });
    
    // Check for potential duplicates
    const duplicateCheck = {};
    allClasses.forEach(cls => {
      const key = `${cls.name}-${cls.year}-${cls.section || 'null'}-${cls.userId}`;
      if (duplicateCheck[key]) {
        console.log('DUPLICATE FOUND:', key);
        console.log('First:', duplicateCheck[key]);
        console.log('Second:', cls);
      } else {
        duplicateCheck[key] = cls;
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugClasses();
