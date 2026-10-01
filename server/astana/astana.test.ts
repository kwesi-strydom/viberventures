import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { AstanaStore } from './store';
import { makeTeams } from './domain';
import { deviceCodeSchema, joinSchema, projectSchema } from '../../shared/astana';

async function setup() {
  const pg = new PGlite();
  await pg.exec(`CREATE TABLE events(id serial primary key,edition integer unique,name text,slug text unique,description text,location text,status text,start_date timestamptz,entry_fee_cents integer,currency text);
    CREATE TABLE users(id serial primary key,edition integer); CREATE TABLE games(id serial primary key,edition integer);
    INSERT INTO events(edition,name,slug) VALUES(5,'Viber 5','viber-5');`);
  const migration = await readFile(new URL('../../scripts/astana.sql', import.meta.url), 'utf8');
  await pg.exec(migration); await pg.exec(migration);
  const adapter = { query: async (sql: string, values: any[] = []) => (await pg.query(sql,values)).rows as any[], transaction: (fn: any) => pg.transaction(async tx => fn({query: async (sql:string,values:any[]=[]) => (await tx.query(sql,values)).rows})) };
  return {pg, store: new AstanaStore(adapter)};
}
const entry = (i:number) => ({name:`Builder ${i}`,email:`builder${i}@example.com`,followConfirmed:true as const});
const project = (revision=0) => ({title:'Astana app',description:'',appUrl:'https://example.com/app',thumbnailUrl:'https://example.com/image.png',socialUrl:null,revision});

test('input validation and balanced teams', () => {
  assert.equal(joinSchema.safeParse({...entry(1),email:'oops'}).success,false);
  assert.equal(joinSchema.safeParse({...entry(1),followConfirmed:false}).success,false);
  assert.equal(joinSchema.parse({...entry(1),email:' BUILDER1@EXAMPLE.COM '}).email,'builder1@example.com');
  for (const n of [0,1,2,3,5,6,31]) {
    const ids=Array.from({length:n},(_,i)=>String(i)); const teams=makeTeams(ids,m=>m-1);
    assert.equal(new Set(teams.flat()).size,n); assert.equal(teams.flat().length,n);
    if(n>1) assert.ok(teams.every(t=>t.length===2||t.length===3));
  }
  assert.deepEqual(makeTeams(['a','b','c','d','e'],m=>m-1).map(t=>t.length),[2,3]);
  assert.equal(projectSchema.safeParse({...project(),appUrl:'javascript:alert(1)'}).success,false);
  assert.equal(projectSchema.safeParse({...project(),appUrl:'https://user:pass@example.com'}).success,false);
  for(const value of ['not a url','%%','https://','/relative']) assert.equal(projectSchema.safeParse({...project(),appUrl:value}).success,false);
  assert.equal(projectSchema.safeParse({...project(),thumbnailUrl:'https://'}).success,false);
  assert.equal(projectSchema.safeParse({...project(),socialUrl:'%%'}).success,false);
  assert.equal(deviceCodeSchema.parse({code:'abcd efgh-jklm-npqr'}).code,'ABCDEFGHJKLMNPQR');
  assert.equal(deviceCodeSchema.safeParse({code:'0000-0000-0000-0000'}).success,false);
});

test('migration is repeatable; join is isolated, idempotent, recoverable', async () => {
  const {pg,store}=await setup();
  try {
    assert.equal((await store.getEvent()).edition,6);
    const first=await store.join(entry(1),null);
    assert.ok(first.token); assert.equal(first.me.guest?.teamId,null);
    assert.equal('email' in first.me.guest!,false);
    assert.equal((await store.join(entry(1),first.token)).me.guest?.id,first.me.guest?.id);
    await assert.rejects(store.join(entry(1),null),/already registered/i);
    assert.equal((await store.getMe('invalid')).guest,null);
    const pendingDevice=await store.issueDeviceCode(first.token);
    const recovery=await store.issueRecovery(first.me.guest!.id);
    const recovered=await store.recover(recovery);
    assert.equal(recovered.me.guest?.id,first.me.guest!.id);
    assert.equal((await store.getMe(first.token)).guest,null);
    await assert.rejects(store.redeemDeviceCode({code:pendingDevice.code}),/invalid or expired/i);
    await assert.rejects(store.recover(recovery),/expired|used/i);
    const expired=await store.issueRecovery(first.me.guest!.id);
    await pg.exec("UPDATE astana_recovery_tokens SET expires_at=now()-interval '1 minute'");
    await assert.rejects(store.recover(expired),/expired|used/i);
    assert.equal((await pg.query("SELECT name FROM events WHERE edition=5")).rows[0].name,'Viber 5');
  } finally { await pg.close(); }
});

test('temporary device codes add a one-use session without removing the source session or changing roster',async()=>{
 const {pg,store}=await setup();
 try{
  const first=await store.join(entry(31),null);
  await store.join(entry(32),null);
  let admin=await store.getAdminState();admin=await store.assignTeams(admin.rosterRevision);
  const firstTeam=admin.teams.find(t=>t.members.some(g=>g.id===first.me.guest!.id))!;
  const issue=await store.issueDeviceCode(first.token);
  assert.match(issue.code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}(-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}){3}$/);
  assert.ok(Date.parse(issue.expiresAt)>Date.now());
  await assert.rejects(store.issueDeviceCode(null),/check in again/i);
  const beforeGuests=await pg.query('SELECT id,team_id FROM astana_guests ORDER BY id');
  const attempts=await Promise.allSettled([
   store.redeemDeviceCode({code:issue.code.toLowerCase()}),
   store.redeemDeviceCode({code:issue.code.replace(/-/g,'')}),
  ]);
  const fulfilled=attempts.filter((r):r is PromiseFulfilledResult<{token:string;me:import('../../shared/astana').Me}>=>r.status==='fulfilled');
  assert.equal(fulfilled.length,1);
  const added=fulfilled[0].value;
  assert.equal(added.me.guest?.id,first.me.guest?.id);
  assert.equal(added.me.team?.id,firstTeam.id);
  assert.equal((await store.getMe(first.token)).guest?.id,first.me.guest?.id);
  const sessions=await pg.query('SELECT count(*)::int AS n FROM astana_sessions WHERE guest_id=$1',[first.me.guest!.id]);
  assert.equal(sessions.rows[0].n,2);
  assert.deepEqual((await pg.query('SELECT id,team_id FROM astana_guests ORDER BY id')).rows,beforeGuests.rows);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM astana_guests')).rows[0].n,2);
  const rejectionMessage=async(action:()=>Promise<unknown>)=>{
   let error:unknown;try{await action();}catch(caught){error=caught;}
   assert.ok(error instanceof Error);return error.message;
  };
  const unknown=await rejectionMessage(()=>store.redeemDeviceCode({code:'ZZZZ-ZZZZ-ZZZZ-ZZZZ'}));
  const reused=await rejectionMessage(()=>store.redeemDeviceCode({code:issue.code}));
  assert.equal(unknown,reused);

  const expired=await store.issueDeviceCode(first.token);
  const codeHash=createHash('sha256').update(expired.code.replace(/-/g,'')).digest('hex');
  await pg.query("UPDATE astana_device_codes SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[codeHash]);
  await assert.rejects(store.redeemDeviceCode({code:expired.code}),/invalid or expired/i);
  await assert.rejects(store.redeemDeviceCode({code:'ZZZZ-ZZZZ-ZZZZ-ZZZZ'}),/invalid or expired/i);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM astana_sessions WHERE guest_id=$1',[first.me.guest!.id])).rows[0].n,2);
  assert.deepEqual((await pg.query('SELECT id,team_id FROM astana_guests ORDER BY id')).rows,beforeGuests.rows);
  for(let i=0;i<3;i++)await store.issueDeviceCode(first.token);
  await assert.rejects(store.issueDeviceCode(first.token),/wait 15 minutes/i);
 }finally{await pg.close();}
});

test('teams, revisions, transfers, submissions, voting and publication', async () => {
 const {pg,store}=await setup();
 try {
  const guests=[]; for(let i=0;i<6;i++) guests.push(await store.join(entry(i),null));
  let admin=await store.getAdminState();
  await store.assignTeams(admin.rosterRevision);
  await assert.rejects(store.assignTeams(admin.rosterRevision),/changed/i);
  admin=await store.getAdminState();
  assert.equal(admin.teams.length,3); assert.equal(admin.teams.flatMap(t=>t.members).length,6);
  const tokenFor=(id:string)=>guests.find(g=>g.me.guest!.id===id)!.token;
  const teamA=admin.teams[0],teamB=admin.teams[1];
  const a=teamA.members[0],b=teamB.members[0];
  const app=await store.saveProject(tokenFor(a.id),project());
  assert.equal(app.teamId,teamA.id);
  await assert.rejects(store.saveProject(tokenFor(a.id),project()),/changed/i);
  await assert.rejects(store.assignTeams(admin.rosterRevision),/submitted/i);
  const late=await store.join(entry(7),null); admin=await store.getAdminState();
  await store.moveGuest(late.me.guest!.id,teamA.id,admin.rosterRevision);
  admin=await store.getAdminState();
  await assert.rejects(store.rotateGuests([a.id,a.id],admin.rosterRevision),/distinct/i);
  await store.rotateGuests([a.id,b.id],admin.rosterRevision);
  assert.equal((await store.getMe(tokenFor(a.id))).team?.id,teamB.id);
  await assert.rejects(store.saveProject(tokenFor(a.id),project(),teamA.id),/team changed/i);
  assert.equal((await store.getMe(tokenFor(b.id))).project?.id,app.id);
  const updated=await store.saveProject(tokenFor(b.id),{...project(1),title:'After transfer'});
  assert.equal(updated.revision,2);
  const concurrent=await Promise.allSettled([store.saveProject(tokenFor(b.id),project(2)),store.saveProject(tokenFor(b.id),project(2))]);
  assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
  await assert.rejects(store.saveProject('invalid',project()),/check in/i);
  const visitor=await store.ensureVisitor(null);
  await assert.rejects(store.rateProject(visitor,tokenFor(b.id),app.id,5),/own team/i);
  await assert.rejects(store.rateProject(visitor,null,app.id,2.5),/whole number/i);
  await store.rateProject(visitor,null,app.id,4); await store.rateProject(visitor,null,app.id,5);
  assert.equal((await store.listProjects())[0].ratingCount,1);
  const visitor2=await store.ensureVisitor(null); await store.rateProject(visitor2,null,app.id,3);
  assert.equal((await store.listProjects())[0].averageRating,4);
  admin=await store.getAdminState();
  for(const t of admin.teams.filter(t=>t.id!==teamA.id)) await store.saveProject(tokenFor(t.members[0].id),project());
  const projects=await store.listProjects();
  await assert.rejects(store.saveWinners([app.id,app.id,app.id],0),/distinct/i);
  await store.saveWinners(projects.map(p=>p.id),0);
  assert.deepEqual(await store.getWinners(),{published:false,projects:[]});
  await assert.rejects(store.publishWinners(0),/changed/i);
  await store.publishWinners(1);
  assert.equal((await store.getWinners()).projects.length,3);
  await store.saveWinners(projects.map(p=>p.id).reverse(),2);
  assert.equal((await store.getWinners()).projects[0].id,projects[0].id);
  assert.equal((await pg.query('SELECT count(*)::int AS n FROM events')).rows[0].n,2);
 } finally {await pg.close();}
});

test('HTTP authorization, cookies, invalid input, origin and privacy', async () => {
 const {default:express}=await import('express');
 const {default:cookieParser}=await import('cookie-parser');
 const {createAstanaRouter}=await import('./routes');
 const {pg,store}=await setup();
 const app=express(); app.use(express.json()); app.use(cookieParser());
 app.use('/api/astana',createAstanaRouter({store,requireAdmin:(req,res,next)=>req.headers['x-test-admin']==='yes'?next():res.status(403).json({message:'Admin required'}),broadcast:()=>{}}));
 const server=app.listen(0,'127.0.0.1');
 await new Promise<void>(r=>server.on('listening',r));
 const port=(server.address() as any).port;
 const request=(path:string,method='GET',body?:unknown,cookie?:string)=>fetch(`http://127.0.0.1:${port}/api/astana${path}`,{method,headers:{'Content-Type':'application/json',...(cookie?{cookie}:{})},body:body && method!=='GET'?JSON.stringify(body):undefined});
 try {
   for(const [method,path] of [['GET','/admin'],['POST','/admin/assign'],['POST','/admin/move'],['POST','/admin/rotate'],['POST','/admin/recover/123'],['PUT','/admin/winners'],['POST','/admin/publish']]) assert.equal((await request(path,method,{})).status,403);
   assert.equal((await request('/join','POST',{...entry(1),followConfirmed:false})).status,400);
   const response=await request('/join','POST',entry(1)); assert.equal(response.status,201);
   const cookie=response.headers.get('set-cookie')!; assert.match(cookie,/HttpOnly/i);
   assert.match(cookie,/SameSite=Lax/i);
   const body=await response.json(); assert.equal('email' in body.guest,false);
    const duplicate=await request('/join','POST',entry(1));assert.equal(duplicate.status,409);
    assert.match((await duplicate.json()).message,/sign-in code form/i);
    const sourceCookie=cookie.split(';')[0];
    assert.equal((await request('/me','GET',undefined,sourceCookie)).status,200);
    assert.equal((await request('/device-code','POST',{})).status,401);
    assert.equal((await request('/device-login','POST',{code:'ZZZZ-ZZZZ-ZZZZ-ZZZZ'})).status,400);
    const issuedResponse=await request('/device-code','POST',{},sourceCookie);assert.equal(issuedResponse.status,200);
    const issued=await issuedResponse.json() as {code:string;expiresAt:string};
    assert.match(issued.code,/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}(-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}){3}$/);
    assert.ok(Date.parse(issued.expiresAt)>Date.now());
    assert.equal('token' in issued,false);
    const deviceResponse=await request('/device-login','POST',{code:issued.code.toLowerCase()});
    assert.equal(deviceResponse.status,200);
    const deviceBody=await deviceResponse.json();
    const deviceCookie=deviceResponse.headers.get('set-cookie')!;
    assert.match(deviceCookie,/HttpOnly/i);
    assert.match(deviceCookie,/SameSite=Lax/i);
    assert.equal('token' in deviceBody,false);
    const deviceCookieValue=deviceCookie.split(';')[0];
    const [originalMe,deviceMe]=await Promise.all([
      request('/me','GET',undefined,sourceCookie).then(r=>r.json()),
      request('/me','GET',undefined,deviceCookieValue).then(r=>r.json()),
    ]);
    assert.equal(originalMe.guest.id,body.guest.id);
    assert.equal(deviceMe.guest.id,body.guest.id);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM astana_guests')).rows[0].n,1);
    assert.equal((await pg.query('SELECT count(*)::int AS n FROM astana_sessions WHERE guest_id=$1',[body.guest.id])).rows[0].n,2);
    const reused=await request('/device-login','POST',{code:issued.code});
    const unknown=await request('/device-login','POST',{code:'ZZZZ-ZZZZ-ZZZZ-ZZZZ'});
    assert.equal(reused.status,400);assert.equal(unknown.status,400);
    assert.equal((await reused.json()).message,(await unknown.json()).message);

   const cross=await fetch(`http://127.0.0.1:${port}/api/astana/join`,{method:'POST',headers:{Origin:'https://evil.example','Content-Type':'application/json'},body:JSON.stringify(entry(2))});
   assert.equal(cross.status,403);
   assert.equal((await request('/project','PUT',{...project(),teamId:'00000000-0000-4000-8000-000000000001'})).status,401);
    for(const [field,value] of [['appUrl','https://'],['thumbnailUrl','not a url'],['socialUrl','%%']]){
      const malformed=await request('/project','PUT',{...project(),teamId:'00000000-0000-4000-8000-000000000001',[field]:value});
      assert.equal(malformed.status,400,`${field} should be a validation error`);
    }
   assert.equal((await request('/visitor','POST')).status,204);
   assert.deepEqual(await (await request('/winners')).json(),{published:false,projects:[]});

    const diagnosticMessages:string[]=[];
    const originalLogger=console.error;
    const originalGetEvent=store.getEvent.bind(store);
    try{
      console.error=(...values:any[])=>diagnosticMessages.push(values.join(' '));
      store.getEvent=async()=>{throw new TypeError('private sentinel must not be logged');};
      assert.equal((await request('/event')).status,500);
    }finally{
      store.getEvent=originalGetEvent;
      console.error=originalLogger;
    }
    assert.match(diagnosticMessages.join(' '),/GET \/api\/astana\/event \(TypeError\)/);
    assert.doesNotMatch(diagnosticMessages.join(' '),/private sentinel/i);
 } finally {server.closeAllConnections(); await new Promise<void>(r=>server.close(()=>r())); await pg.close();}
});

test('arena adapter preserves an empty Astana roster and never falls back to V5',async()=>{
 const {arenaTeamNames,disputeTeams}=await import('./arena');
 let fallbackCalls=0;
 assert.deepEqual(await arenaTeamNames(true,async()=>[],async()=>{fallbackCalls++;return ['V5 Team'];}),[]);
 assert.equal(fallbackCalls,0);
 assert.deepEqual(await arenaTeamNames(false,async()=>[],async()=>['V5 Team']),['V5 Team']);
 assert.deepEqual(disputeTeams(['A']),[]);
 assert.deepEqual(disputeTeams(['A','B']),['A','B']);
 assert.deepEqual(disputeTeams(['A','A','B','C']),['A','B','C']);
});

test('late arrival can create a new team without disturbing existing assignments',async()=>{
 const {pg,store}=await setup();try{
  const arrival=await store.join(entry(88),null);const before=await store.getAdminState();
  const after=await store.moveGuest(arrival.me.guest!.id,null,before.rosterRevision);
  assert.equal(after.teams.length,1);assert.equal(after.teams[0].members[0].id,arrival.me.guest!.id);
  assert.equal(after.rosterRevision,before.rosterRevision+1);
 }finally{await pg.close();}
});

test('roster selection is invalidated when a newer revision arrives',async()=>{
 const {selectionAtRevision}=await import('../../shared/astana-selection');
 assert.deepEqual(selectionAtRevision({revision:2,value:['guest-a','guest-b']},3,[]),[]);
 assert.deepEqual(selectionAtRevision({revision:2,value:['guest-a','guest-b']},2,[]),['guest-a','guest-b']);
});

test('switching arena rosters preserves previous team IDs, ranks, colors and shields',async()=>{
 const {reconcileDashboardTeams}=await import('../dashboard-projection');
 const old={id:1,name:'Team 1',sortOrder:0,color:'#123456',rank:1,shields:4};
 const rows=[old];
 const sync=(names:string[])=>reconcileDashboardTeams(rows,names,async(name:string,sortOrder:number)=>{const t={id:rows.length+1,name,sortOrder,color:'#ffff00',rank:0,shields:0};rows.push(t);return t;},async(row:any,sortOrder:number)=>Object.assign(row,{sortOrder}));
 const astana=await sync(['Astana Team 1']);assert.equal(astana.length,1);assert.equal(rows.length,2);
 const restored=await sync(['Team 1']);assert.deepEqual(restored,[old]);assert.equal(restored[0].shields,4);assert.equal(restored[0].id,1);
});

test('canceled V5 registrations and payments survive Astana setup without enrollment', async () => {
 const pg = new PGlite();
 try {
  await pg.exec(`CREATE TABLE events(id serial primary key,edition integer unique,name text,slug text unique,description text,location text,status text,start_date timestamptz,entry_fee_cents integer,currency text);
   CREATE TABLE users(id serial primary key,edition integer,email text);
   CREATE TABLE games(id serial primary key,edition integer);
   CREATE TABLE event_participations(id serial primary key,user_id integer,event_id integer,payment_status text,payment_ref text);
   INSERT INTO events(edition,name,slug) VALUES(5,'Viber 5','viber-5');
   INSERT INTO users VALUES(42,5,'v5@example.com');
   INSERT INTO event_participations VALUES(7,42,1,'paid','preserved-payment');`);
  const beforeUsers = (await pg.query('SELECT * FROM users')).rows;
  const beforePayments = (await pg.query('SELECT * FROM event_participations')).rows;
  const migration = await readFile(new URL('../../scripts/astana.sql', import.meta.url),'utf8');
  await pg.exec(migration); await pg.exec(migration);
  assert.deepEqual((await pg.query('SELECT * FROM users')).rows,beforeUsers);
  assert.deepEqual((await pg.query('SELECT * FROM event_participations')).rows,beforePayments);
  assert.equal((await pg.query('SELECT * FROM astana_guests')).rows.length,0);
 } finally { await pg.close(); }
});
