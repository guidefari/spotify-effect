import {
  Album,
  Artist,
  AudioFeatures,
  Category,
  CursorBasedPaging,
  CurrentlyPlaying,
  CurrentlyPlayingContext,
  Device,
  Episode,
  Paging,
  PlayHistory,
  PlaylistItem,
  QueueObject,
  RecommendationSeed,
  SavedAlbum,
  SavedShow,
  SavedTrack,
  SimplifiedAlbum,
  SimplifiedEpisode,
  SimplifiedPlaylist,
  SimplifiedShow,
  SimplifiedTrack,
  Track,
} from "./SpotifyObjects";

export type GetAlbumsResponse = {
  albums: Array<Album | null>;
};

export type GetAlbumTracksResponse = Paging<SimplifiedTrack>;

export type GetArtistAlbumsResponse = Paging<SimplifiedAlbum>;

export type GetArtistsResponse = {
  artists: Artist[];
};

export type GetArtistTopTracksResponse = {
  tracks: Track[];
};

export type GetRelatedArtistsResponse = {
  artists: Artist[];
};

export type GetAvailableGenreSeedsResponse = {
  genres: string[];
};

export type GetCategoriesResponse = {
  categories: Paging<Category>;
};

export type GetCategoryPlaylistsResponse = {
  playlists: Paging<SimplifiedPlaylist>;
};

export type GetFeaturedPlaylistsResponse = {
  message: string;
  playlists: Paging<SimplifiedPlaylist>;
};

export type GetNewReleasesResponse = {
  albums: Paging<SimplifiedAlbum>;
};

export type GetRecommendationsResponse = {
  seeds: RecommendationSeed[];
  tracks: Track[];
};

export type GetEpisodesResponse = {
  episodes: Array<Episode | null>;
};

export type GetFollowedArtistsResponse = {
  artists: CursorBasedPaging<Artist>;
};

export type GetSavedAlbumsResponse = Paging<SavedAlbum>;

export type GetSavedShowsResponse = Paging<SavedShow>;

export type GetSavedTracksResponse = Paging<SavedTrack>;

export type GetMyTopArtistsResponse = Paging<Artist>;

export type GetMyTopTracksResponse = Paging<Track>;

export type GetMyDevicesResponse = {
  devices: Device[];
};

export type GetPlaybackInfoResponse = CurrentlyPlayingContext;

export type GetCurrentlyPlayingTrackResponse = CurrentlyPlaying;

export type GetRecentlyPlayedTracksResponse = CursorBasedPaging<PlayHistory>;

export type GetQueueResponse = QueueObject;

export type GetMyPlaylistsResponse = Paging<SimplifiedPlaylist>;

export type GetPlaylistItemsResponse = Paging<PlaylistItem>;

export type GetUserPlaylistsResponse = Paging<SimplifiedPlaylist>;

export type SnapshotIdResponse = {
  snapshot_id: string;
};

export type SearchResponse = Partial<
  SearchAlbumsResponse &
    SearchArtistsResponse &
    SearchEpisodesResponse &
    SearchPlaylistsResponse &
    SearchShowsResponse &
    SearchTracksResponse
>;

export type SearchAlbumsResponse = {
  albums: Paging<SimplifiedAlbum>;
};

export type SearchArtistsResponse = {
  artists: Paging<Artist>;
};

export type SearchEpisodesResponse = {
  episodes: Paging<SimplifiedEpisode>;
};

export type SearchPlaylistsResponse = {
  playlists: Paging<SimplifiedPlaylist>;
};

export type SearchShowsResponse = {
  shows: Paging<SimplifiedShow>;
};

export type SearchTracksResponse = {
  tracks: Paging<Track>;
};

export type GetShowsResponse = {
  shows: Array<SimplifiedShow | null>;
};

export type GetShowEpisodesResponse = Paging<SimplifiedEpisode>;

export type GetAudioFeaturesForTracksResponse = {
  audio_features: Array<AudioFeatures | null>;
};

export type GetTracksResponse = {
  tracks: Array<Track | null>;
};
