import { TracksApi } from "./api/Tracks"
import { makeSpotifyRequest } from "./services/SpotifyRequest"

export interface SpotifyWebApiOptions {
  clientId?: string
  clientSecret?: string
  redirectUri?: string
}

export interface SpotifyWebApiCredentials {
  accessToken?: string
}

export class SpotifyWebApi {
  private readonly _clientId: string
  private readonly _clientSecret: string
  private readonly _redirectUri: string
  private accessToken: string

  public readonly tracks: TracksApi

  public constructor(
    options: SpotifyWebApiOptions = {},
    credentials?: SpotifyWebApiCredentials,
  ) {
    this._clientId = options.clientId ?? ""
    this._clientSecret = options.clientSecret ?? ""
    this._redirectUri = options.redirectUri ?? ""
    this.accessToken = credentials?.accessToken ?? ""

    this.tracks = new TracksApi(
      makeSpotifyRequest({
        getAccessToken: () => this.accessToken,
      }),
    )
  }

  public getAccessToken(): string {
    return this.accessToken
  }

  public setAccessToken(accessToken: string): void {
    this.accessToken = accessToken
  }

  public get clientId(): string {
    return this._clientId
  }

  public get clientSecret(): string {
    return this._clientSecret
  }

  public get redirectUri(): string {
    return this._redirectUri
  }
}

export default SpotifyWebApi
