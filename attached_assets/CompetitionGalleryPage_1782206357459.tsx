import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ArrowLeft, Star, Trophy } from 'lucide-react';
import type { Competition, Game } from '@shared/schema';

const CompetitionGalleryPage = () => {
  const { competitionId } = useParams<{ competitionId: string }>();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: competition } = useQuery<Competition>({
    queryKey: [`/api/competitions/${competitionId}`],
  });

  const { data: apps, isLoading } = useQuery<Array<Game & { avg_rating: number; rating_count: number }>>({
    queryKey: [`/api/competitions/${competitionId}/games`],
  });

  const filteredApps = apps?.filter((app) => {
    const search = searchQuery.toLowerCase();
    return (
      app.title.toLowerCase().includes(search) ||
      app.description.toLowerCase().includes(search) ||
      app.creator?.toLowerCase().includes(search)
    );
  });

  const handleAppClick = (appUrl: string) => {
    window.open(appUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="text-center py-20">
        <div className="text-neon-orange font-pixel animate-pulse">Loading apps...</div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/competitions')}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          data-testid="button-back"
        >
          <ArrowLeft size={24} className="text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white mb-1">{competition?.title || 'Competition'} - Apps Gallery</h1>
          <p className="text-gray-400">{competition?.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/submit', { state: { competitionId } })}
            className="px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center gap-2"
            data-testid="button-submit-app"
          >
            Submit App
          </button>
          <button
            onClick={() => navigate(`/competitions/${competitionId}/leaderboard`)}
            className="px-6 py-3 bg-emerald-500 text-white rounded-lg font-semibold hover:bg-emerald-600 transition-all flex items-center gap-2"
            data-testid="button-leaderboard"
          >
            <Trophy size={20} />
            Leaderboard
          </button>
        </div>
      </div>

      {/* Search and Refresh */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search apps..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 pl-12 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-neon-orange transition-all"
            data-testid="input-search"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
        </div>
      </div>

      {/* Apps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredApps && filteredApps.length > 0 ? (
          filteredApps.map((app) => (
            <div
              key={app.id}
              onClick={() => handleAppClick(app.game_url)}
              className="bg-gradient-to-br from-gray-900 to-black border border-gray-700/50 rounded-lg overflow-hidden hover:border-neon-orange/50 transition-all cursor-pointer group"
              data-testid={`app-card-${app.id}`}
            >
              {/* Thumbnail */}
              <img
                src={app.thumbnail_url || 'https://via.placeholder.com/400x300'}
                alt={app.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-neon-orange transition-colors line-clamp-1">
                    {app.title}
                  </h3>
                  <p className="text-sm text-gray-400">{app.creator || 'Anonymous'}</p>
                </div>

                <p className="text-sm text-gray-500 line-clamp-2">{app.description}</p>

                {/* Rating */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={16}
                        className={
                          star <= Math.round(app.avg_rating)
                            ? 'fill-neon-yellow text-neon-yellow'
                            : 'text-gray-600'
                        }
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-neon-yellow">
                      {app.avg_rating ? app.avg_rating.toFixed(1) : '0.0'}
                    </span>
                    <span className="text-sm text-gray-500">({app.rating_count || 0})</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-20">
            <Trophy size={64} className="text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">No apps submitted yet</h3>
            <p className="text-gray-500">Be the first to submit an app to this competition!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionGalleryPage;
