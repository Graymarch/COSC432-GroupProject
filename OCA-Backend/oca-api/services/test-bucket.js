require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const storageClient = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = 'cosc432-course-materials';

(async () => {
    try {
        console.log('Testing Supabase connection...');
        console.log('URL:', process.env.SUPABASE_URL);
        console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'NOT SET');
        
        const { data: objects, error } = await storageClient.storage
            .from(BUCKET)
            .list('', { limit: 1000 });
        
        if (error) {
            console.error('Error:', error);
            return;
        }
        
        console.log('\nFiles found:', objects.length);
        objects.forEach((file, idx) => {
            console.log(`${idx + 1}. ${file.name}`);
        });
        
    } catch (err) {
        console.error('Fatal error:', err.message);
    }
})();