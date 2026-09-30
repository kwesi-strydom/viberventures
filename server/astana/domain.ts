import { randomInt } from 'node:crypto';
export class AstanaError extends Error { constructor(public status:number,message:string){super(message);} }
export function makeTeams(ids:string[],random:(max:number)=>number=randomInt):string[][] {
 const shuffled=[...ids];
 for(let i=shuffled.length-1;i>0;i--){const j=random(i+1);[shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];}
 const groups:string[][]=[];
 for(let i=0;i<shuffled.length;i+=2) groups.push(shuffled.slice(i,i+2));
 if(groups.length>1&&groups.at(-1)!.length===1) groups[groups.length-2].push(...groups.pop()!);
 return groups;
}
