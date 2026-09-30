import {useState} from 'react';
import type {AdminState} from '@shared/astana';
import {astanaRequest,useAstana,useRefreshAstana,useRosterSelection} from '@/hooks/useAstana';
import {LoadState,Notice} from './AstanaLayout';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import './astana.css';
export default function AstanaDisputeDialog({teamNames,onClose}:{teamNames:string[];onClose:()=>void}){
 const admin=useAstana<AdminState>('/admin');const refresh=useRefreshAstana();const [selected,setSelected]=useRosterSelection<Record<string,string>>(admin.data?.rosterRevision??-1,{}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const names=Array.from(new Set(teamNames.filter(Boolean))).slice(0,3);
 async function swap(){setBusy(true);setError('');try{await astanaRequest('/admin/rotate','POST',{guestIds:names.map(n=>selected[n]),rosterRevision:admin.data!.rosterRevision});await refresh();onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="max-w-3xl"><div className="astana p-0"><DialogHeader><DialogTitle>Founders’ dispute</DialogTitle><DialogDescription>Select one member from each affected team. They rotate to the next team shown.</DialogDescription></DialogHeader>{admin.isLoading||admin.error?<LoadState error={admin.error}/>:names.length<2?<p className="my-6">Only one team was selected. A swap needs at least two teams; keep building.</p>:<div className="astana-form my-6">{names.map((name,i)=><label key={name}>{name} → {names[(i+1)%names.length]}<select value={selected[name]??''} onChange={e=>setSelected(s=>({...s,[name]:e.target.value}))}><option value="">Choose a builder</option>{admin.data?.teams.find(t=>t.name===name)?.members.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>)}</div>}<Notice error message={error}/><div className="astana-actions"><button className="btn btn-primary" disabled={busy||names.length<2||!names.every(n=>selected[n])||!admin.data} onClick={swap}>{busy?'Saving…':'Confirm swap / rotation'}</button><button className="btn" disabled={busy} onClick={onClose}>Close</button></div></div></DialogContent></Dialog>;
}
