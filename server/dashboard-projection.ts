// Return only the active roster, retaining inactive rows and their historical IDs.
// A later event switch can restore the prior colors, shields and standings.
export async function reconcileDashboardTeams<T extends {name:string;sortOrder:number}>(
 existing:T[],desiredNames:string[],create:(name:string,sortOrder:number)=>Promise<T>,move:(row:T,sortOrder:number)=>Promise<T>,
):Promise<T[]>{
 const seen=new Map<string,T>();for(const row of existing)if(!seen.has(row.name))seen.set(row.name,row);
 const active:T[]=[];
 for(const [i,name] of Array.from(new Set(desiredNames)).entries()){
  const row=seen.get(name);active.push(!row?await create(name,i):row.sortOrder===i?row:await move(row,i));
 }
 return active;
}
