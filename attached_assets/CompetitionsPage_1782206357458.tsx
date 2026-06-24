import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, Calendar, Trophy, Users } from 'lucide-react';
import type { Competition } from '@shared/schema';

const CompetitionsPage = () => {
  const navigate = useNavigate();

  const { data: competitions, isLoading } = useQuery<Competition[]>({
    queryKey: ['/api/competitions'],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-neon-green';
      case 'completed':
        return 'text-gray-500';
      default:
        return 'text-neon-orange';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-neon-green/20 text-neon-green border-neon-green/50';
      case 'completed':
        return 'bg-gray-700/50 text-gray-400 border-gray-600';
      default:
        return 'bg-neon-orange/20 text-neon-orange border-neon-orange/50';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="text-neon-orange font-pixel animate-pulse">Loading competitions...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Competitions</h1>
          <p className="text-gray-400">Join vibecoding hackathons and showcase your AI-generated apps</p>
        </div>
        <button
          onClick={() => navigate('/competitions/create')}
          className="px-6 py-3 bg-gradient-to-r from-neon-orange to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-neon-orange/50 transition-all flex items-center gap-2"
          data-testid="button-create-competition"
        >
          <Plus size={20} />
          Create Competition
        </button>
      </div>

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {competitions && competitions.length > 0 ? (
          competitions.map((competition) => (
            <div
              key={competition.id}
              onClick={() => navigate(`/competitions/${competition.id}`)}
              className="bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-lg overflow-hidden hover:border-neon-orange/50 transition-all cursor-pointer group"
              data-testid={`competition-card-${competition.id}`}
            >
              {/* Thumbnail */}
              {competition.thumbnailUrl ? (
                <img
                  src={competition.thumbnailUrl}
                  alt={competition.title}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-48 bg-gradient-to-br from-neon-orange/20 to-neon-purple/20 flex items-center justify-center">
                  <Trophy size={64} className="text-neon-orange/50" />
                </div>
              )}

              {/* Content */}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-xl font-bold text-white group-hover:text-neon-orange transition-colors line-clamp-2">
                    {competition.title}
                  </h3>
                  <span
                    className={`px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(
                      competition.status
                    )} whitespace-nowrap`}
                  >
                    {competition.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-gray-400 text-sm line-clamp-2">{competition.description}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-neon-purple" />
                    <div>
                      <div className="text-xs text-gray-500">Start Date</div>
                      <div className="text-sm text-white font-semibold">
                        {competition.startDateDisplay || new Date(competition.startDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Trophy size={16} className="text-neon-yellow" />
                    <div>
                      <div className="text-xs text-gray-500">Prize</div>
                      <div className="text-sm text-neon-yellow font-semibold">{competition.prize}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Users size={16} className="text-neon-green" />
                  <span className="text-sm text-gray-400">
                    {competition.participantCount} {competition.participantCount === 1 ? 'participant' : 'participants'}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20">
            <Trophy size={64} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No competitions yet</h3>
            <p className="text-gray-500 mb-6">Be the first to create a vibecoding competition!</p>
            <button
              onClick={() => navigate('/competitions/create')}
              className="px-6 py-3 bg-gradient-to-r from-neon-orange to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-neon-orange/50 transition-all"
            >
              Create First Competition
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionsPage;
