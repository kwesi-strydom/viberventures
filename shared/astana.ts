import { z } from 'zod';
export const ASTANA_SLUG = 'viber-astana';
export const ASTANA_DATE = 'September 30, 2026';
export const ASTANA_LOCATION = 'Nur Alem Pavilion · 5th floor · Network School';
const webUrl = z.string().trim().max(2000).url().refine(value => {
  const u = new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password;
}, 'Use a full http:// or https:// URL without a password.');
export const joinSchema = z.object({name:z.string().trim().min(1).max(100),email:z.string().trim().toLowerCase().email().max(254),followConfirmed:z.literal(true)});
export const projectSchema = z.object({title:z.string().trim().min(1).max(120),description:z.string().trim().max(500).default(''),appUrl:webUrl,thumbnailUrl:webUrl,socialUrl:z.union([webUrl,z.literal(''),z.null()]).transform(v=>v||null),revision:z.number().int().nonnegative()});
export type ProjectInput = z.infer<typeof projectSchema>;
export type Guest = {id:string;name:string;teamId:string|null};
export type EventTeam = {id:string;name:string;members:Guest[]};
export type Project = ProjectInput & {id:string;teamId:string;teamName:string;averageRating:number;ratingCount:number};
export type Me = {guest:Guest|null;team:EventTeam|null;project:Project|null};
export type Winners = {published:boolean;projects:Project[]};
export type AstanaEvent = {id:number;edition:number;name:string;slug:string;location:string;status:string};
export type AdminState = {eventId:number;rosterRevision:number;judgingRevision:number;guests:(Guest&{email:string})[];teams:EventTeam[];projects:Project[];draftProjectIds:string[];publishedProjectIds:string[]};
