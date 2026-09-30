import {Link} from 'react-router-dom';
import AstanaLayout,{LoadState} from '@/components/astana/AstanaLayout';
import ProjectCard from '@/components/astana/ProjectCard';
import {useAstana} from '@/hooks/useAstana';
import type {Project,Me} from '@shared/astana';
export default function AstanaLaunchpad(){const projects=useAstana<Project[]>('/projects'),me=useAstana<Me>('/me');return <AstanaLayout><h1>Built in Astana.</h1><p className="astana-lead mb-9">An hour of ideas, challenges, and shipping. Open an app, give it a try, and cast your rating.</p>{projects.isLoading||projects.error?<LoadState error={projects.error}/>:projects.data?.length?<div className="arena-grid cols-3 xl:grid-cols-4">{projects.data.map(p=><ProjectCard key={p.id} project={p} allowVote ownTeam={me.data?.team?.id===p.teamId}/>)}</div>:<div className="astana-panel"><h2>The builders are getting started.</h2><p>Projects appear here as teams launch them. This page updates automatically.</p><Link className="btn mt-6" to="/astana/team">Share your team’s project</Link></div>}<p className="astana-note mt-8">Audience ratings celebrate the room’s favorites. Judges choose the official top three.</p></AstanaLayout>;}
