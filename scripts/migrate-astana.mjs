import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import { readFile } from 'node:fs/promises';
neonConfig.webSocketConstructor=ws;
const connectionString=process.env.NEON_DATABASE_URL||process.env.DATABASE_URL;
if(!connectionString) throw new Error('Set NEON_DATABASE_URL or DATABASE_URL before migration.');
const pool=new Pool({connectionString});
const client=await pool.connect();
try {
 await client.query('BEGIN');
 await client.query(await readFile(new URL('./astana.sql',import.meta.url),'utf8'));
 await client.query('COMMIT');
 console.log('Astana additive migration complete. Existing editions preserved. Arena not switched.');
} catch(error){await client.query('ROLLBACK');throw error;}
finally{client.release();await pool.end();}
