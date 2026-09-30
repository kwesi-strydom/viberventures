import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ASTANA_SLUG, joinSchema, projectSchema, type AdminState, type AstanaEvent, type EventTeam, type Guest, type Me, type Project, type ProjectInput, type Winners } from '../../shared/astana';
import { AstanaError, makeTeams } from './domain';
export interface Sql {query(sql:string,values?:unknown[]):Promise<any[]>;}
export interface Database extends Sql {transaction<T>(fn:(tx:Sql)=>Promise<T>):Promise<T>;}
const hash=(token:string)=>createHash('sha256').update(token).digest('hex');
const token=()=>randomBytes(32).toString('hex');
const guestDTO=(g:any):Guest=>({id:g.id,name:g.name,teamId:g.team_id});
const empty:Me={guest:null,team:null,project:null};
export class AstanaStore {
 constructor(private db:Database){}
 async getEvent(q:Sql=this.db):Promise<AstanaEvent>{
  const [e]=await q.query('SELECT id,edition,name,slug,location,status FROM events WHERE slug=$1',[ASTANA_SLUG]);
  if(!e) throw new AstanaError(503,'Astana is not open yet. Please ask the organizer.'); return e;
 }
 private async locked<T>(fn:(tx:Sql,eventId:number,state:any)=>Promise<T>):Promise<T>{
  return this.db.transaction(async tx=>{const event=await this.getEvent(tx);const [state]=await tx.query('SELECT * FROM astana_event_state WHERE event_id=$1 FOR UPDATE',[event.id]);return fn(tx,event.id,state);});
 }
 private checkRevision(actual:number,expected:number){if(actual!==expected)throw new AstanaError(409,'This changed in another session. Refresh and try again.');}
 private async session(q:Sql,value:string|null|undefined){
  if(!value||value.length>128)return null;
  const [g]=await q.query(`SELECT g.* FROM astana_sessions s JOIN astana_guests g ON g.id=s.guest_id JOIN events e ON e.id=g.event_id WHERE s.token_hash=$1 AND s.expires_at>now() AND e.slug=$2`,[hash(value),ASTANA_SLUG]);return g??null;
 }
 private async requireGuest(q:Sql,value:string|null|undefined){const g=await this.session(q,value);if(!g)throw new AstanaError(401,'Please check in again or ask the organizer to restore your session.');return g;}
 private async newSession(q:Sql,id:string){const value=token();await q.query("INSERT INTO astana_sessions VALUES($1,$2,now()+interval '7 days')",[hash(value),id]);return value;}
 async join(raw:unknown,sessionToken:string|null):Promise<{token:string;me:Me}>{
  const input=joinSchema.parse(raw);
  const value=await this.locked(async(tx,eventId)=>{
   const existing=await this.session(tx,sessionToken);
   if(existing){if(existing.email!==input.email)throw new AstanaError(409,'This browser is already checked in. Ask the organizer before changing participant.');return sessionToken!;}
   if((await tx.query('SELECT id FROM astana_guests WHERE event_id=$1 AND email=$2',[eventId,input.email])).length)throw new AstanaError(409,'This email is already registered. Use your original browser or ask the organizer to restore access.');
   const id=randomUUID();await tx.query('INSERT INTO astana_guests(id,event_id,name,email) VALUES($1,$2,$3,$4)',[id,eventId,input.name,input.email]);
   await tx.query('UPDATE astana_event_state SET roster_revision=roster_revision+1 WHERE event_id=$1',[eventId]);return this.newSession(tx,id);
  });
  return {token:value,me:await this.getMe(value)};
 }
 async getTeams(q:Sql=this.db):Promise<EventTeam[]>{
  const e=await this.getEvent(q);
  const teams=await q.query('SELECT id,name FROM astana_teams WHERE event_id=$1 ORDER BY name',[e.id]);
  const guests=await q.query('SELECT id,name,team_id FROM astana_guests WHERE event_id=$1 ORDER BY name',[e.id]);
  return teams.map(t=>({...t,members:guests.filter(g=>g.team_id===t.id).map(guestDTO)}));
 }
 async getMe(value:string|null):Promise<Me>{
  const g=await this.session(this.db,value);if(!g)return {...empty};
  const [teams,projects]=await Promise.all([this.getTeams(),this.listProjects()]);
  return {guest:guestDTO(g),team:teams.find(t=>t.id===g.team_id)??null,project:projects.find(p=>p.teamId===g.team_id)??null};
 }
 async issueRecovery(id:string):Promise<string>{return this.locked(async(tx,eventId)=>{
  if(!(await tx.query('SELECT id FROM astana_guests WHERE id=$1 AND event_id=$2',[id,eventId])).length)throw new AstanaError(404,'Participant not found.');
  await tx.query('UPDATE astana_recovery_tokens SET consumed_at=now() WHERE guest_id=$1 AND consumed_at IS NULL',[id]);
  const value=token();await tx.query("INSERT INTO astana_recovery_tokens(token_hash,guest_id,expires_at) VALUES($1,$2,now()+interval '10 minutes')",[hash(value),id]);return value;
 });}
 async recover(value:string):Promise<{token:string;me:Me}>{
  const session=await this.locked(async(tx,eventId)=>{
   const [r]=await tx.query(`SELECT r.guest_id FROM astana_recovery_tokens r JOIN astana_guests g ON g.id=r.guest_id WHERE r.token_hash=$1 AND r.expires_at>now() AND r.consumed_at IS NULL AND g.event_id=$2 FOR UPDATE OF r`,[hash(value),eventId]);
   if(!r)throw new AstanaError(400,'Recovery link expired or already used. Ask the organizer for a new one.');
   await tx.query('UPDATE astana_recovery_tokens SET consumed_at=now() WHERE token_hash=$1',[hash(value)]);
   await tx.query('DELETE FROM astana_sessions WHERE guest_id=$1',[r.guest_id]);return this.newSession(tx,r.guest_id);
  });return {token:session,me:await this.getMe(session)};
 }
 async assignTeams(revision:number){await this.locked(async(tx,eventId,state)=>{
  this.checkRevision(state.roster_revision,revision);
  if((await tx.query('SELECT id FROM astana_projects WHERE event_id=$1 LIMIT 1',[eventId])).length)throw new AstanaError(409,'Projects have been submitted. Move or swap members instead of reshuffling.');
  const guests=await tx.query('SELECT id FROM astana_guests WHERE event_id=$1 ORDER BY id',[eventId]);
  if(guests.length<2)throw new AstanaError(400,'At least two checked-in builders are needed.');
  await tx.query('UPDATE astana_guests SET team_id=NULL WHERE event_id=$1',[eventId]);
  await tx.query('DELETE FROM astana_teams WHERE event_id=$1',[eventId]);
  let index=0;for(const group of makeTeams(guests.map(g=>g.id))){const id=randomUUID();await tx.query('INSERT INTO astana_teams VALUES($1,$2,$3)',[id,eventId,`Astana Team ${++index}`]);for(const member of group)await tx.query('UPDATE astana_guests SET team_id=$1 WHERE id=$2 AND event_id=$3',[id,member,eventId]);}
  await tx.query('UPDATE astana_event_state SET roster_revision=roster_revision+1 WHERE event_id=$1',[eventId]);
 });return this.getAdminState();}
 async moveGuest(id:string,teamId:string|null,revision:number){await this.locked(async(tx,eventId,state)=>{
  this.checkRevision(state.roster_revision,revision);
  const [g]=await tx.query('SELECT * FROM astana_guests WHERE id=$1 AND event_id=$2',[id,eventId]);if(!g)throw new AstanaError(404,'Participant not found.');
  if(teamId!==null && g.team_id===teamId)return;
  if(g.team_id&&(await tx.query('SELECT id FROM astana_guests WHERE team_id=$1',[g.team_id])).length===1)throw new AstanaError(409,'This would leave an empty team. Swap members instead.');
  if(teamId){if(!(await tx.query('SELECT id FROM astana_teams WHERE id=$1 AND event_id=$2',[teamId,eventId])).length)throw new AstanaError(404,'Team not found.');}
  else {teamId=randomUUID();const [count]=await tx.query('SELECT count(*)::int AS n FROM astana_teams WHERE event_id=$1',[eventId]);await tx.query('INSERT INTO astana_teams VALUES($1,$2,$3)',[teamId,eventId,`Astana Team ${count.n+1}`]);}
  await tx.query('UPDATE astana_guests SET team_id=$1 WHERE id=$2',[teamId,id]);await tx.query('UPDATE astana_event_state SET roster_revision=roster_revision+1 WHERE event_id=$1',[eventId]);
 });return this.getAdminState();}
 async rotateGuests(ids:string[],revision:number){await this.locked(async(tx,eventId,state)=>{
  this.checkRevision(state.roster_revision,revision);
  if(ids.length<2||ids.length>3||new Set(ids).size!==ids.length)throw new AstanaError(400,'Choose two or three distinct participants from distinct teams.');
  const members=[];for(const id of ids){const [g]=await tx.query('SELECT id,team_id FROM astana_guests WHERE id=$1 AND event_id=$2',[id,eventId]);if(!g?.team_id)throw new AstanaError(400,'Every selected participant must belong to this event and a team.');members.push(g);}
  if(new Set(members.map(g=>g.team_id)).size!==members.length)throw new AstanaError(400,'Choose participants from distinct teams.');
  for(let i=0;i<members.length;i++)await tx.query('UPDATE astana_guests SET team_id=$1 WHERE id=$2',[members[(i+1)%members.length].team_id,members[i].id]);
  await tx.query('UPDATE astana_event_state SET roster_revision=roster_revision+1 WHERE event_id=$1',[eventId]);
 });return this.getAdminState();}
 async listProjects(q:Sql=this.db):Promise<Project[]>{
  const e=await this.getEvent(q);const rows=await q.query(`SELECT p.*,t.name AS team_name,COALESCE(avg(r.rating),0)::float8 AS average_rating,count(r.rating)::int AS rating_count FROM astana_projects p JOIN astana_teams t ON t.id=p.team_id LEFT JOIN astana_ratings r ON r.project_id=p.id WHERE p.event_id=$1 GROUP BY p.id,t.name ORDER BY p.created_at,p.id`,[e.id]);
  return rows.map(p=>({id:p.id,teamId:p.team_id,teamName:p.team_name,title:p.title,description:p.description,appUrl:p.app_url,thumbnailUrl:p.thumbnail_url,socialUrl:p.social_url,revision:p.revision,averageRating:Number(p.average_rating),ratingCount:Number(p.rating_count)}));
 }
 async saveProject(value:string|null,raw:ProjectInput,expectedTeamId?:string):Promise<Project>{
  const input=projectSchema.parse(raw);const id=await this.locked(async(tx,eventId)=>{
   const g=await this.requireGuest(tx,value);if(expectedTeamId && g.team_id!==expectedTeamId)throw new AstanaError(409,'Your team changed. Reload your team page before saving.');if(!g.team_id)throw new AstanaError(403,'Wait for the organizer to assign your team.');
   const [existing]=await tx.query('SELECT id,revision FROM astana_projects WHERE team_id=$1 AND event_id=$2',[g.team_id,eventId]);
   this.checkRevision(existing?.revision??0,input.revision);
   if(existing){await tx.query('UPDATE astana_projects SET title=$1,description=$2,app_url=$3,thumbnail_url=$4,social_url=$5,revision=revision+1,updated_at=now() WHERE id=$6',[input.title,input.description,input.appUrl,input.thumbnailUrl,input.socialUrl,existing.id]);return existing.id;}
   const id=randomUUID();await tx.query('INSERT INTO astana_projects(id,event_id,team_id,title,description,app_url,thumbnail_url,social_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,eventId,g.team_id,input.title,input.description,input.appUrl,input.thumbnailUrl,input.socialUrl]);return id;
  });return (await this.listProjects()).find(p=>p.id===id)!;
 }
 async ensureVisitor(value:string|null):Promise<string>{
  if(value&&value.length<=128&&(await this.db.query('SELECT token_hash FROM astana_visitors WHERE token_hash=$1 AND expires_at>now()',[hash(value)])).length)return value;
  const next=token();await this.db.query("INSERT INTO astana_visitors VALUES($1,now()+interval '7 days')",[hash(next)]);return next;
 }
 async rateProject(visitor:string|null,session:string|null,id:string,rating:number):Promise<Project>{
  if(!Number.isInteger(rating)||rating<1||rating>5)throw new AstanaError(400,'Rating must be a whole number from 1 to 5.');
  await this.locked(async(tx,eventId)=>{
   if(!visitor||visitor.length>128||!(await tx.query('SELECT token_hash FROM astana_visitors WHERE token_hash=$1 AND expires_at>now()',[hash(visitor)])).length)throw new AstanaError(401,'Please refresh the page to start voting.');
   const [p]=await tx.query('SELECT team_id FROM astana_projects WHERE id=$1 AND event_id=$2',[id,eventId]);if(!p)throw new AstanaError(404,'Project not found.');
   const guest=await this.session(tx,session);if(guest?.team_id===p.team_id)throw new AstanaError(403,'You cannot rate your own team.');
   await tx.query('INSERT INTO astana_ratings VALUES($1,$2,$3) ON CONFLICT(project_id,visitor_hash) DO UPDATE SET rating=EXCLUDED.rating',[id,hash(visitor),rating]);
  });return (await this.listProjects()).find(p=>p.id===id)!;
 }
 async saveWinners(ids:string[],revision:number){await this.locked(async(tx,eventId,state)=>{
  this.checkRevision(state.judging_revision,revision);
  if(ids.length!==3||new Set(ids).size!==3)throw new AstanaError(400,'Choose three distinct submitted projects.');
  for(const id of ids)if(!(await tx.query('SELECT id FROM astana_projects WHERE id=$1 AND event_id=$2',[id,eventId])).length)throw new AstanaError(400,'Each winner must be an Astana project.');
  await tx.query("DELETE FROM astana_winners WHERE event_id=$1 AND stage='draft'",[eventId]);
  for(let i=0;i<ids.length;i++)await tx.query("INSERT INTO astana_winners VALUES($1,$2,$3,'draft')",[eventId,i+1,ids[i]]);
  await tx.query('UPDATE astana_event_state SET judging_revision=judging_revision+1 WHERE event_id=$1',[eventId]);
 });return this.getAdminState();}
 async publishWinners(revision:number){await this.locked(async(tx,eventId,state)=>{
  this.checkRevision(state.judging_revision,revision);
  const draft=await tx.query("SELECT project_id FROM astana_winners WHERE event_id=$1 AND stage='draft' ORDER BY rank",[eventId]);
  if(draft.length!==3)throw new AstanaError(400,'Save three winners before publishing.');
  await tx.query("DELETE FROM astana_winners WHERE event_id=$1 AND stage='published'",[eventId]);
  await tx.query("INSERT INTO astana_winners SELECT event_id,rank,project_id,'published' FROM astana_winners WHERE event_id=$1 AND stage='draft'",[eventId]);
  await tx.query('UPDATE astana_event_state SET judging_revision=judging_revision+1 WHERE event_id=$1',[eventId]);
 });return this.getWinners();}
 async getWinners():Promise<Winners>{const event=await this.getEvent();const ranks=await this.db.query("SELECT project_id FROM astana_winners WHERE event_id=$1 AND stage='published' ORDER BY rank",[event.id]);const projects=await this.listProjects();return {published:ranks.length===3,projects:ranks.map(r=>projects.find(p=>p.id===r.project_id)!)};}
 async getAdminState():Promise<AdminState>{return this.db.transaction(async tx=>{
  const event=await this.getEvent(tx);const [state]=await tx.query('SELECT * FROM astana_event_state WHERE event_id=$1 FOR SHARE',[event.id]);
  const guests=await tx.query('SELECT id,name,email,team_id FROM astana_guests WHERE event_id=$1 ORDER BY name',[event.id]);
  const ranks=await tx.query('SELECT stage,project_id FROM astana_winners WHERE event_id=$1 ORDER BY rank',[event.id]);
  return {eventId:event.id,rosterRevision:state.roster_revision,judgingRevision:state.judging_revision,guests:guests.map(g=>({...guestDTO(g),email:g.email})),teams:await this.getTeams(tx),projects:await this.listProjects(tx),draftProjectIds:ranks.filter(r=>r.stage==='draft').map(r=>r.project_id),publishedProjectIds:ranks.filter(r=>r.stage==='published').map(r=>r.project_id)};
 });}
}
