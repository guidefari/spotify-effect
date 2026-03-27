import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { FetchHttpClient, type HttpClient } from "effect/unstable/http";
import { AlbumsApi } from "./api/Albums";
import { ArtistsApi } from "./api/Artists";
import { BrowseApi } from "./api/Browse";
import { PlaylistsApi } from "./api/Playlists";
import { SearchApi } from "./api/Search";
import { TracksApi } from "./api/Tracks";
import { UsersApi } from "./api/Users";
import { type SpotifyRequestError } from "./errors/SpotifyError";
import type {
  GetRefreshableUserTokensResponse,
  GetRefreshedAccessTokenResponse,
  GetTemporaryAppTokensResponse,
} from "./model/SpotifyAuthorization";
import type {
  Album,
  Artist,
  Category,
  Paging,
  Playlist,
  PlaylistDetails,
  PlaylistItem,
  PrivateUser,
  PublicUser,
  SimplifiedAlbum,
  SimplifiedPlaylist,
  SimplifiedTrack,
  Track,
} from "./model/SpotifyObjects";
import type {
  AddItemsToPlaylistOptions,
  CreatePlaylistOptions,
  GetAlbumTracksOptions,
  GetArtistAlbumsOptions,
  GetCategoriesOptions,
  GetCategoryOptions,
  GetCategoryPlaylistsOptions,
  GetFeaturedPlaylistsOptions,
  GetMyPlaylistsOptions,
  GetNewReleasesOptions,
  GetPlaylistItemsOptions,
  GetPlaylistOptions,
  GetUserPlaylistsOptions,
  MarketOptions,
  SearchOptions,
} from "./model/SpotifyOptions";
import type {
  GetAlbumsResponse,
  GetArtistTopTracksResponse,
  GetArtistsResponse,
  GetCategoriesResponse,
  GetCategoryPlaylistsResponse,
  GetFeaturedPlaylistsResponse,
  GetNewReleasesResponse,
  GetRelatedArtistsResponse,
  GetTracksResponse,
  SearchResponse,
  SnapshotIdResponse,
} from "./model/SpotifyResponses";
import { makeSpotifyAuth } from "./services/SpotifyAuth";
import type { SpotifyAuth } from "./services/SpotifyAuth";
import { makeSpotifyRequest, type SpotifyRetryConfig } from "./services/SpotifyRequest";
import { makeSpotifySession, type SpotifySession } from "./services/SpotifySession";
import {
  getAuthorizationUrl,
  type GetAuthorizationUrlOptions,
  type PKCEExtensionOptions,
} from "./utils/getAuthorizationUrl";
import type { SearchType } from "./model/SpotifyObjects";

export interface SpotifyWebApiOptions {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  httpClientLayer?: Layer.Layer<HttpClient.HttpClient>;
  retry?: SpotifyRetryConfig;
}

export interface SpotifyWebApiCredentials {
  accessToken?: string;
  accessTokenExpiresAt?: number;
  refreshToken?: string;
}

interface ProvidedTracksApi {
  getTrack(trackId: string, options?: MarketOptions): Effect.Effect<Track, SpotifyRequestError>;
  getTracks(
    trackIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetTracksResponse["tracks"], SpotifyRequestError>;
}

interface ProvidedUsersApi {
  getCurrentUserProfile(): Effect.Effect<PrivateUser, SpotifyRequestError>;
  getUser(userId: string): Effect.Effect<PublicUser, SpotifyRequestError>;
}

interface ProvidedAlbumsApi {
  getAlbum(albumId: string, options?: MarketOptions): Effect.Effect<Album, SpotifyRequestError>;
  getAlbums(
    albumIds: ReadonlyArray<string>,
    options?: MarketOptions,
  ): Effect.Effect<GetAlbumsResponse["albums"], SpotifyRequestError>;
  getAlbumTracks(
    albumId: string,
    options?: GetAlbumTracksOptions,
  ): Effect.Effect<Paging<SimplifiedTrack>, SpotifyRequestError>;
}

interface ProvidedArtistsApi {
  getArtist(artistId: string): Effect.Effect<Artist, SpotifyRequestError>;
  getArtists(
    artistIds: ReadonlyArray<string>,
  ): Effect.Effect<GetArtistsResponse["artists"], SpotifyRequestError>;
  getArtistAlbums(
    artistId: string,
    options?: GetArtistAlbumsOptions,
  ): Effect.Effect<Paging<SimplifiedAlbum>, SpotifyRequestError>;
  getArtistTopTracks(
    artistId: string,
    country: string,
  ): Effect.Effect<GetArtistTopTracksResponse["tracks"], SpotifyRequestError>;
  getRelatedArtists(
    artistId: string,
  ): Effect.Effect<GetRelatedArtistsResponse["artists"], SpotifyRequestError>;
}

interface ProvidedBrowseApi {
  getCategories(
    options?: GetCategoriesOptions,
  ): Effect.Effect<GetCategoriesResponse["categories"], SpotifyRequestError>;
  getCategory(
    categoryId: string,
    options?: GetCategoryOptions,
  ): Effect.Effect<Category, SpotifyRequestError>;
  getCategoryPlaylists(
    categoryId: string,
    options?: GetCategoryPlaylistsOptions,
  ): Effect.Effect<GetCategoryPlaylistsResponse["playlists"], SpotifyRequestError>;
  getFeaturedPlaylists(
    options?: GetFeaturedPlaylistsOptions,
  ): Effect.Effect<GetFeaturedPlaylistsResponse, SpotifyRequestError>;
  getNewReleases(
    options?: GetNewReleasesOptions,
  ): Effect.Effect<GetNewReleasesResponse["albums"], SpotifyRequestError>;
  getAvailableGenreSeeds(): Effect.Effect<string[], SpotifyRequestError>;
}

interface ProvidedPlaylistsApi {
  getPlaylist(playlistId: string, options?: GetPlaylistOptions): Effect.Effect<Playlist, SpotifyRequestError>;
  getPlaylistItems(playlistId: string, options?: GetPlaylistItemsOptions): Effect.Effect<Paging<PlaylistItem>, SpotifyRequestError>;
  getMyPlaylists(options?: GetMyPlaylistsOptions): Effect.Effect<Paging<SimplifiedPlaylist>, SpotifyRequestError>;
  getUserPlaylists(userId: string, options?: GetUserPlaylistsOptions): Effect.Effect<Paging<SimplifiedPlaylist>, SpotifyRequestError>;
  createPlaylist(userId: string, name: string, options?: CreatePlaylistOptions): Effect.Effect<Playlist, SpotifyRequestError>;
  addItemsToPlaylist(playlistId: string, uris: ReadonlyArray<string>, options?: AddItemsToPlaylistOptions): Effect.Effect<SnapshotIdResponse, SpotifyRequestError>;
  removePlaylistItems(playlistId: string, uris: ReadonlyArray<string>, snapshotId?: string): Effect.Effect<SnapshotIdResponse, SpotifyRequestError>;
  changePlaylistDetails(playlistId: string, details: PlaylistDetails): Effect.Effect<void, SpotifyRequestError>;
}

interface ProvidedSearchApi {
  search(
    query: string,
    types: ReadonlyArray<SearchType>,
    options?: SearchOptions,
  ): Effect.Effect<SearchResponse, SpotifyRequestError>;
}

const isConfigured = (value: string): boolean => value.length > 0;

export class SpotifyWebApi {
  private readonly _clientId: string;
  private readonly _clientSecret: string;
  private readonly _redirectUri: string;
  private readonly _retryConfig: SpotifyRetryConfig | undefined;
  private readonly provideHttpClient: <A, E>(
    effect: Effect.Effect<A, E, HttpClient.HttpClient>,
  ) => Effect.Effect<A, E>;
  private readonly appAuth: SpotifyAuth;
  private readonly session: SpotifySession;

  public readonly tracks: ProvidedTracksApi;
  public readonly users: ProvidedUsersApi;
  public readonly albums: ProvidedAlbumsApi;
  public readonly artists: ProvidedArtistsApi;
  public readonly browse: ProvidedBrowseApi;
  public readonly playlists: ProvidedPlaylistsApi;
  public readonly search: ProvidedSearchApi;

  public constructor(options: SpotifyWebApiOptions = {}, credentials?: SpotifyWebApiCredentials) {
    this._clientId = options.clientId ?? "";
    this._clientSecret = options.clientSecret ?? "";
    this._redirectUri = options.redirectUri ?? "";
    this._retryConfig = options.retry;
    this.appAuth = makeSpotifyAuth({
      clientId: this._clientId,
      clientSecret: this._clientSecret,
      redirectUri: this._redirectUri,
    });
    this.session = makeSpotifySession(credentials);

    const layer = options.httpClientLayer ?? FetchHttpClient.layer;
    this.provideHttpClient = <A, E>(
      effect: Effect.Effect<A, E, HttpClient.HttpClient>,
    ): Effect.Effect<A, E> => Effect.provide(effect, layer);

    const makeRequest = () =>
      makeSpotifyRequest(
        {
          getAccessToken: () =>
            this.session.getAccessToken({
              auth: this.appAuth,
              canUseClientCredentials:
                isConfigured(this._clientId) && isConfigured(this._clientSecret),
            }),
          invalidateAccessToken: () => this.session.invalidateAccessToken(),
        },
        this._retryConfig,
      );

    const request = makeRequest();

    const rawTracks = new TracksApi(request);
    const rawUsers = new UsersApi(request);
    const rawAlbums = new AlbumsApi(request);
    const rawArtists = new ArtistsApi(request);
    const rawBrowse = new BrowseApi(request);
    const rawPlaylists = new PlaylistsApi(request);
    const rawSearch = new SearchApi(request);

    this.tracks = {
      getTrack: (trackId, opts) => this.provideHttpClient(rawTracks.getTrack(trackId, opts)),
      getTracks: (trackIds, opts) => this.provideHttpClient(rawTracks.getTracks(trackIds, opts)),
    };
    this.users = {
      getCurrentUserProfile: () => this.provideHttpClient(rawUsers.getCurrentUserProfile()),
      getUser: (userId) => this.provideHttpClient(rawUsers.getUser(userId)),
    };
    this.albums = {
      getAlbum: (albumId, opts) => this.provideHttpClient(rawAlbums.getAlbum(albumId, opts)),
      getAlbums: (albumIds, opts) => this.provideHttpClient(rawAlbums.getAlbums(albumIds, opts)),
      getAlbumTracks: (albumId, opts) =>
        this.provideHttpClient(rawAlbums.getAlbumTracks(albumId, opts)),
    };
    this.artists = {
      getArtist: (artistId) => this.provideHttpClient(rawArtists.getArtist(artistId)),
      getArtists: (artistIds) => this.provideHttpClient(rawArtists.getArtists(artistIds)),
      getArtistAlbums: (artistId, opts) =>
        this.provideHttpClient(rawArtists.getArtistAlbums(artistId, opts)),
      getArtistTopTracks: (artistId, country) =>
        this.provideHttpClient(rawArtists.getArtistTopTracks(artistId, country)),
      getRelatedArtists: (artistId) =>
        this.provideHttpClient(rawArtists.getRelatedArtists(artistId)),
    };
    this.browse = {
      getCategories: (opts) => this.provideHttpClient(rawBrowse.getCategories(opts)),
      getCategory: (categoryId, opts) =>
        this.provideHttpClient(rawBrowse.getCategory(categoryId, opts)),
      getCategoryPlaylists: (categoryId, opts) =>
        this.provideHttpClient(rawBrowse.getCategoryPlaylists(categoryId, opts)),
      getFeaturedPlaylists: (opts) => this.provideHttpClient(rawBrowse.getFeaturedPlaylists(opts)),
      getNewReleases: (opts) => this.provideHttpClient(rawBrowse.getNewReleases(opts)),
      getAvailableGenreSeeds: () => this.provideHttpClient(rawBrowse.getAvailableGenreSeeds()),
    };
    this.playlists = {
      getPlaylist: (playlistId, opts) => this.provideHttpClient(rawPlaylists.getPlaylist(playlistId, opts)),
      getPlaylistItems: (playlistId, opts) => this.provideHttpClient(rawPlaylists.getPlaylistItems(playlistId, opts)),
      getMyPlaylists: (opts) => this.provideHttpClient(rawPlaylists.getMyPlaylists(opts)),
      getUserPlaylists: (userId, opts) => this.provideHttpClient(rawPlaylists.getUserPlaylists(userId, opts)),
      createPlaylist: (userId, name, opts) => this.provideHttpClient(rawPlaylists.createPlaylist(userId, name, opts)),
      addItemsToPlaylist: (playlistId, uris, opts) => this.provideHttpClient(rawPlaylists.addItemsToPlaylist(playlistId, uris, opts)),
      removePlaylistItems: (playlistId, uris, snapshotId) => this.provideHttpClient(rawPlaylists.removePlaylistItems(playlistId, uris, snapshotId)),
      changePlaylistDetails: (playlistId, details) => this.provideHttpClient(rawPlaylists.changePlaylistDetails(playlistId, details)),
    };
    this.search = {
      search: (query, types, opts) => this.provideHttpClient(rawSearch.search(query, types, opts)),
    };
  }

  public getTemporaryAppTokens(): Effect.Effect<
    GetTemporaryAppTokensResponse,
    SpotifyRequestError
  > {
    return this.provideHttpClient(this.session.getTemporaryAppTokens(this.appAuth));
  }

  public getAuthorizationCodeUrl(options?: GetAuthorizationUrlOptions): string {
    return getAuthorizationUrl(this.clientId, this.redirectUri, "code", options);
  }

  public getAuthorizationCodePKCEUrl(
    clientId: string,
    options: GetAuthorizationUrlOptions & PKCEExtensionOptions,
  ): string {
    return getAuthorizationUrl(clientId, this.redirectUri, "code", options);
  }

  public getTemporaryAuthorizationUrl(options?: GetAuthorizationUrlOptions): string {
    return getAuthorizationUrl(this.clientId, this.redirectUri, "token", options);
  }

  public getTokenWithAuthenticateCode(
    code: string,
  ): Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth
        .getRefreshableUserTokens(code)
        .pipe(Effect.tap((tokens) => this.session.setRefreshableUserTokens(tokens))),
    );
  }

  public getTokenWithAuthenticateCodePKCE(
    code: string,
    codeVerifier: string,
    clientId: string,
  ): Effect.Effect<GetRefreshableUserTokensResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth
        .getRefreshableUserTokensWithPkce({
          clientId,
          code,
          codeVerifier,
        })
        .pipe(Effect.tap((tokens) => this.session.setRefreshableUserTokens(tokens))),
    );
  }

  public getRefreshedAccessToken(
    refreshToken: string,
  ): Effect.Effect<GetRefreshedAccessTokenResponse, SpotifyRequestError> {
    return this.provideHttpClient(
      this.appAuth
        .getRefreshedAccessToken(refreshToken)
        .pipe(
          Effect.tap((tokens) => this.session.updateRefreshedAccessToken(refreshToken, tokens)),
        ),
    );
  }

  public getAccessToken(): string {
    return this.session.getStoredAccessToken();
  }

  public setAccessToken(accessToken: string): void {
    Effect.runSync(this.session.setAccessToken(accessToken));
  }

  public setRefreshableUserTokens(tokens: GetRefreshableUserTokensResponse): void {
    Effect.runSync(this.session.setRefreshableUserTokens(tokens));
  }

  public getAccessTokenExpiresAt(): number | undefined {
    return this.session.getStoredAccessTokenExpiresAt();
  }

  public getRefreshToken(): string | undefined {
    return this.session.getStoredRefreshToken();
  }

  public get clientId(): string {
    return this._clientId;
  }

  public get clientSecret(): string {
    return this._clientSecret;
  }

  public get redirectUri(): string {
    return this._redirectUri;
  }
}

export default SpotifyWebApi;
