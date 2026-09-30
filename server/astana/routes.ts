import { Router, type Request, type Response, type RequestHandler } from 'express';
import { z, ZodError } from 'zod';
import { createHash } from 'node:crypto';
import { AstanaStore } from './store';
import { projectSchema } from '../../shared/astana';
import { AstanaError } from './domain';
const revision=z.number().int().nonnegative();
const uuid=z.string().uuid();
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/api/astana',maxAge:7*86400*1000};
export function createAstanaRouter({store,requireAdmin,broadcast}:{store:AstanaStore;requireAdmin:RequestHandler;broadcast:(payload:unknown)=>void}) {
 const router=Router();
 const limits=new Map<string,{count:number;until:number}>();
 const limit=(key:string,max:number)=>{
  const now=Date.now();
  if(limits.size>20000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);
  if(limits.size>25000)throw new AstanaError(429,'The check-in service is busy. Please retry in a minute.');
  const row=limits.get(key);if(!row||row.until<now){limits.set(key,{count:1,until:now+60000});return;}
  if(++row.count>max)throw new AstanaError(429,'Please wait a minute before trying again.');
 };
 const guest=(req:Request)=>req.cookies?.astanaSession??null;
 const visitor=(req:Request)=>req.cookies?.astanaVisitor??null;
 const run=(fn:(req:Request,res:Response)=>Promise<unknown>):RequestHandler=>async(req,res)=>{
  try {await fn(req,res);}catch(error){
   if(error instanceof ZodError){res.status(400).json({message:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});return;}
   if(error instanceof AstanaError){res.status(error.status).json({message:error.message});return;}
   console.error('Astana request failed:',error instanceof Error?error.name:'unknown');
   res.status(500).json({message:'Unable to save or load right now. Please retry; your form is still here.'});
  }
 };
 router.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(req.method)){
   const origin=req.get('Origin');
   let cross=req.get('Sec-Fetch-Site')==='cross-site';
   if(origin){try{cross ||= new URL(origin).host!==req.get('host');}catch{cross=true;}}
   if(cross){res.status(403).json({message:'Please submit from the Viber website.'});return;}
  }
  next();
 });
 router.get('/event',run(async(_req,res)=>res.json(await store.getEvent())));
 router.get('/me',run(async(req,res)=>res.json(await store.getMe(guest(req)))));
 router.post('/join',run(async(req,res)=>{
  limit(`join:${req.ip}`,100);const result=await store.join(req.body,guest(req));res.cookie('astanaSession',result.token,cookieOptions);res.status(201).json(result.me);
 }));
 router.post('/recover',run(async(req,res)=>{
  limit(`recover:${req.ip}`,30);const {token}=z.object({token:z.string().regex(/^[a-f0-9]{64}$/)}).parse(req.body);const result=await store.recover(token);res.cookie('astanaSession',result.token,cookieOptions);res.json(result.me);
 }));
 router.get('/projects',run(async(_req,res)=>res.json(await store.listProjects())));
 router.put('/project',run(async(req,res)=>{limit(`project:${guest(req)}`,30);const input=projectSchema.extend({teamId:uuid}).parse(req.body);res.json(await store.saveProject(guest(req),input,input.teamId));broadcast({type:'astana_update'});}));
 router.post('/visitor',run(async(req,res)=>{limit(`visitor:${req.ip}`,2000);const value=await store.ensureVisitor(visitor(req));res.cookie('astanaVisitor',value,cookieOptions);res.sendStatus(204);}));
 router.put('/projects/:id/rating',run(async(req,res)=>{
  limit(`ip:${req.ip}`,2000);limit(`vote:${createHash('sha256').update(String(visitor(req))).digest('hex')}`,30);
  const id=uuid.parse(req.params.id);const {rating}=z.object({rating:z.number().int().min(1).max(5)}).parse(req.body);
  res.json(await store.rateProject(visitor(req),guest(req),id,rating));
 }));
 router.get('/winners',run(async(_req,res)=>res.json(await store.getWinners())));
 router.use('/admin',requireAdmin);
 router.get('/admin',run(async(_req,res)=>res.json(await store.getAdminState())));
 router.post('/admin/assign',run(async(req,res)=>{const body=z.object({rosterRevision:revision}).parse(req.body);res.json(await store.assignTeams(body.rosterRevision));broadcast({type:'dashboard_update'});}));
 router.post('/admin/move',run(async(req,res)=>{const b=z.object({guestId:uuid,teamId:uuid.nullable(),rosterRevision:revision}).parse(req.body);res.json(await store.moveGuest(b.guestId,b.teamId,b.rosterRevision));broadcast({type:'dashboard_update'});}));
 router.post('/admin/rotate',run(async(req,res)=>{const b=z.object({guestIds:z.array(uuid).min(2).max(3),rosterRevision:revision}).parse(req.body);res.json(await store.rotateGuests(b.guestIds,b.rosterRevision));broadcast({type:'dashboard_update'});}));
 router.post('/admin/recover/:guestId',run(async(req,res)=>{const value=await store.issueRecovery(uuid.parse(req.params.guestId));res.json({recoveryPath:`/astana/join#recover=${value}`});}));
 router.put('/admin/winners',run(async(req,res)=>{const b=z.object({projectIds:z.array(uuid).length(3),judgingRevision:revision}).parse(req.body);res.json(await store.saveWinners(b.projectIds,b.judgingRevision));}));
 router.post('/admin/publish',run(async(req,res)=>{const b=z.object({judgingRevision:revision}).parse(req.body);res.json(await store.publishWinners(b.judgingRevision));broadcast({type:'astana_update'});}));
 return router;
}
