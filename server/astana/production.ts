import { pool } from '../db';
import { AstanaStore, type Sql } from './store';
export const astanaStore=new AstanaStore({
 query:async(sql,values=[]) => (await pool.query(sql,values as any[])).rows,
 transaction:async fn=>{
  const client=await pool.connect();
  try{await client.query('BEGIN');const tx:Sql={query:async(sql,values=[]) => (await client.query(sql,values as any[])).rows};const result=await fn(tx);await client.query('COMMIT');return result;}
  catch(error){await client.query('ROLLBACK');throw error;}
  finally{client.release();}
 }
});
