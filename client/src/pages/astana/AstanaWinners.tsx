import AstanaLayout,{LoadState} from '@/components/astana/AstanaLayout';
import ProjectCard from '@/components/astana/ProjectCard';
import {useAstana} from '@/hooks/useAstana';
import type {Winners} from '@shared/astana';
export default function AstanaWinners(){const {data,isLoading,error}=useAstana<Winners>('/winners');return <AstanaLayout><h1>Astana’s top three.</h1>{isLoading||error?<LoadState error={error}/>:data?.published?<><p className="astana-lead mb-9">Chosen by the judges. Built under pressure. Congratulations to every team that shipped.</p><div className="astana-grid">{data.projects.map((p,i)=><ProjectCard key={p.id} project={p} rank={i+1}/>)}</div></>:<div className="astana-empty"><h2>The verdict is still to come.</h2><p className="astana-lead">The judges’ top three will appear here when the organizer reveals the results.</p></div>}</AstanaLayout>;}
