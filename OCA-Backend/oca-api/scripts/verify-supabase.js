#!/usr/bin/env node

/**
 * Supabase Setup Verification Script
 * 
 * This script verifies that Supabase is properly configured
 * and all required components are set up correctly.
 * 
 * Usage: node scripts/verify-supabase.js
 */

require('dotenv').config();
const supabase = require('../config/database');

async function verifySupabase() {
  console.log('🔍 Verifying Supabase Setup...\n');
  console.log('='.repeat(50));

  // Step 1: Check environment variables
  console.log('\n1️⃣  Checking Environment Variables...');
  const hasUrl = !!process.env.SUPABASE_URL;
  const hasKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!hasUrl) {
    console.log('   ❌ SUPABASE_URL not found in .env');
  } else {
    console.log('   ✅ SUPABASE_URL is set');
    console.log(`      ${process.env.SUPABASE_URL.substring(0, 30)}...`);
  }

  if (!hasKey) {
    console.log('   ❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  } else {
    console.log('   ✅ SUPABASE_SERVICE_ROLE_KEY is set');
    console.log(`      Key length: ${process.env.SUPABASE_SERVICE_ROLE_KEY.length} characters`);
  }

  if (!hasUrl || !hasKey) {
    console.log('\n⚠️  Please update your .env file with Supabase credentials.');
    console.log('   See SUPABASE_SETUP.md for instructions.');
    process.exit(1);
  }

  // Step 2: Check Supabase client
  console.log('\n2️⃣  Checking Supabase Client...');
  if (!supabase) {
    console.log('   ❌ Supabase client not initialized');
    process.exit(1);
  }
  console.log('   ✅ Supabase client initialized');

  // Step 3: Check database connection
  console.log('\n3️⃣  Testing Database Connection...');
  try {
    const { data, error } = await supabase.from('sessions').select('count').limit(1);
    if (error) {
      console.log('   ⚠️  Connection test failed:', error.message);
      console.log('      This might be normal if tables don\'t exist yet.');
    } else {
      console.log('   ✅ Database connection successful');
    }
  } catch (err) {
    console.log('   ❌ Database connection failed:', err.message);
    process.exit(1);
  }

  // Step 4: Check required tables
  console.log('\n4️⃣  Checking Required Tables...');
  const tables = ['document_chunks', 'sessions', 'interactions'];
  let allTablesExist = true;

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`   ❌ Table '${table}' does not exist`);
        allTablesExist = false;
      } else {
        console.log(`   ✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking table '${table}':`, err.message);
      allTablesExist = false;
    }
  }

  if (!allTablesExist) {
    console.log('\n⚠️  Some tables are missing. Run supabase-schema-768.sql in Supabase SQL Editor.');
  }

  // Step 5: Check match_documents function
  console.log('\n5️⃣  Checking Vector Search Function...');
  try {
    // Try calling the function with a dummy embedding
    const dummyEmbedding = new Array(768).fill(0);
    const { error } = await supabase.rpc('match_documents', {
      query_embedding: dummyEmbedding,
      match_threshold: 0.7,
      match_count: 1
    });

    if (error) {
      if (error.message.includes('does not exist')) {
        console.log('   ❌ Function match_documents does not exist');
        console.log('      Run supabase-schema-768.sql in Supabase SQL Editor.');
      } else if (error.message.includes('dimension')) {
        console.log('   ⚠️  Function exists but dimension mismatch');
        console.log('      Check that schema uses vector(768) for nomic-embed-text');
      } else {
        console.log('   ⚠️  Function check:', error.message);
      }
    } else {
      console.log('   ✅ Function match_documents exists and works');
    }
  } catch (err) {
    console.log('   ❌ Error checking function:', err.message);
  }

  // Step 6: Check storage bucket
  console.log('\n6️⃣  Checking Storage Bucket...');
  try {
    const { data, error } = await supabase.storage.from('cosc432-course-materials').list('', { limit: 1 });
    if (error) {
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        console.log('   ❌ Bucket "cosc432-course-materials" does not exist');
        console.log('      Create it in Supabase Storage dashboard.');
      } else {
        console.log('   ⚠️  Storage check:', error.message);
      }
    } else {
      console.log('   ✅ Bucket "cosc432-course-materials" exists');
    }
  } catch (err) {
    console.log('   ⚠️  Error checking storage:', err.message);
  }

  // Step 7: Check document chunks count
  console.log('\n7️⃣  Checking Document Chunks...');
  try {
    const { count, error } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('   ⚠️  Could not check chunks:', error.message);
    } else {
      if (count === 0) {
        console.log('   ⚠️  No document chunks found');
        console.log('      Run: node services/chunky.js to process documents');
      } else {
        console.log(`   ✅ Found ${count} document chunks in database`);
      }
    }
  } catch (err) {
    console.log('   ⚠️  Error checking chunks:', err.message);
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 Verification Complete!\n');

  console.log('Next Steps:');
  console.log('1. If tables are missing: Run supabase-schema-768.sql in Supabase SQL Editor');
  console.log('2. If bucket is missing: Create "cosc432-course-materials" bucket in Storage');
  console.log('3. If no chunks: Run "node services/chunky.js" to process documents');
  console.log('4. Test RAG: POST to /api/chat with a question\n');
}

// Run verification
verifySupabase().catch(err => {
  console.error('\n❌ Verification failed:', err.message);
  process.exit(1);
});

