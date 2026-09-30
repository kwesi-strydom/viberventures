import type {EventTeam} from '../../shared/astana';
export async function arenaTeamNames(isAstana:boolean,guestTeams:()=>Promise<EventTeam[]>,legacy:()=>Promise<string[]>):Promise<string[]>{
 return isAstana?(await guestTeams()).map(t=>t.name):legacy();
}
export function disputeTeams(selected:string[]):string[]{const teams=Array.from(new Set(selected.filter(Boolean))).slice(0,3);return teams.length>=2?teams:[];}
