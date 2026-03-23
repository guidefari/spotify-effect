import { AUTHORIZE_URL } from "../constants";
import type { AuthorizationScope } from "../model/SpotifyAuthorization";

export interface GetAuthorizationUrlOptions {
  scope?: ReadonlyArray<AuthorizationScope>;
  show_dialog?: boolean;
  state?: string;
}

export interface PKCEExtensionOptions {
  code_challenge: string;
  code_challenge_method: "S256";
}

const hasPkceOptions = (
  options:
    | GetAuthorizationUrlOptions
    | (GetAuthorizationUrlOptions & PKCEExtensionOptions)
    | undefined,
): options is GetAuthorizationUrlOptions & PKCEExtensionOptions =>
  options !== undefined && "code_challenge" in options;

export const getAuthorizationUrl = (
  clientId: string,
  redirectUri: string,
  responseType: "code" | "token",
  options?: GetAuthorizationUrlOptions | (GetAuthorizationUrlOptions & PKCEExtensionOptions),
): string => {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: responseType,
  });

  if (options?.state !== undefined) {
    params.set("state", options.state);
  }

  if (options?.show_dialog !== undefined) {
    params.set("show_dialog", String(options.show_dialog));
  }

  if (options?.scope !== undefined) {
    params.set("scope", options.scope.join(" "));
  }

  if (hasPkceOptions(options)) {
    params.set("code_challenge", options.code_challenge);
    params.set("code_challenge_method", options.code_challenge_method);
  }

  return `${AUTHORIZE_URL}?${params.toString()}`;
};
