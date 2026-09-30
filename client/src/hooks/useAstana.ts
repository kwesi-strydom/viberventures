import {useState} from 'react';
import {selectionAtRevision} from '@shared/astana-selection';
import { useQuery, useQueryClient } from '@tanstack/react-query';
export async function astanaRequest<T>(path:string,method='GET',body?:unknown):Promise<T>{
 const response=await fetch(`/api/astana${path}`,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const data=response.status===204?undefined:await response.json();
 if(!response.ok)throw new Error(data?.message||'Unable to connect. Please try again.');return data;
}
export function useAstana<T>(path:string,enabled=true){return useQuery<T>({queryKey:['astana',path],queryFn:()=>astanaRequest<T>(path),enabled,refetchInterval:15000,refetchIntervalInBackground:false,retry:1});}
export function useRefreshAstana(){const q=useQueryClient();return ()=>q.invalidateQueries({queryKey:['astana']});}

// Polling must not silently apply an old selection to a newly fetched roster.
export function useRosterSelection<T>(revision:number,empty:T){
 const [selection,setSelection]=useState<{revision:number;value:T}|null>(null);
 const value=selectionAtRevision(selection,revision,empty);
 const setValue=(next:T|((previous:T)=>T))=>setSelection(previous=>({revision,value:typeof next==='function'?(next as (value:T)=>T)(selectionAtRevision(previous,revision,empty)):next}));
 return [value,setValue] as const;
}
