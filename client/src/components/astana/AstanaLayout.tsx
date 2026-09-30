import { Link, NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ASTANA_DATE, ASTANA_LOCATION } from '@shared/astana';
import './astana.css';
export default function AstanaLayout({children}:{children:ReactNode}){
 return <div className="astana"><header className="astana-header"><Link to="/astana" className="astana-brand"><img src="/website/assets/viber-logo.png" alt="Viber"/><span>Astana</span></Link><span className="astana-partner">with Superteam Kazakhstan</span></header><nav className="astana-nav" aria-label="Astana event"><NavLink end to="/astana">The event</NavLink><NavLink to="/astana/join">Check in</NavLink><NavLink to="/astana/team">My team</NavLink><NavLink to="/astana/launchpad">Launchpad</NavLink><NavLink to="/astana/winners">Winners</NavLink></nav><div className="astana-content">{children}</div><footer className="astana-footer"><p>{ASTANA_DATE} · {ASTANA_LOCATION}</p><a href="https://x.com/viberventures" target="_blank" rel="noopener noreferrer">Follow @viberventures</a></footer></div>;
}
export function LoadState({error}:{error?:Error|null}){return <div className="astana-empty" role="status">{error?<><h2>Couldn’t load the event</h2><p>{error.message}</p><button className="btn" onClick={()=>window.location.reload()}>Try again</button></>:<p>Loading Astana…</p>}</div>;}
export function Notice({message,error=false}:{message:string;error?:boolean}){return message?<p className={error?'astana-notice astana-error':'astana-notice'} role={error?'alert':'status'}>{message}</p>:null;}
