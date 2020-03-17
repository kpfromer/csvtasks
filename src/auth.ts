import { OAuth2Client, Credentials } from 'google-auth-library';
import { config } from './main';

export type UserPrompt = (message: string) => Promise<string>;

export interface AuthOptions {
  clientId: string;
  clientSecret: string;
  prompt: UserPrompt;
}

/**
 * Handles the authorization flow, intended for command line usage.
 *
 * @example
 *   var auth = new UserAuthorizer({
 *     clientId: 'my-client-id',
 *     clientSecret: 'my-client-secret',
 *     filePath: '/path/to/persistent/token/storage'
 *   });
 *
 *   var credentials = auth.getUserCredentials('user@example.com', 'https://www.googleapis.com/auth/slides');
 *   credentials.then(function(oauth2Client) {
 *     // Valid oauth2Client for use with google APIs.
 *   });
 *
 *   @callback UserAuthorizer-promptCallback
 *   @param {String} url Authorization URL to display to user or open in browser
 *   @returns {Promise.<String>} Promise yielding the authorization code
 */
export default class UserAuthorizer {
  private redirectUrl = 'urn:ietf:wg:oauth:2.0:oob';
  private clientId: string;
  private clientSecret: string;
  private prompt: UserPrompt;

  /**
   * Initialize the authorizer.
   *
   * This may block briefly to ensure the token file exists.
   *
   * @param {String} clientId Client ID
   * @param {String} clientSecret Client secret
   * @param {String} filePath Path to file where tokens are saved
   * @param {UserAuthorizer~promptCallback} prompt Function to acquire the authorization code
   */
  public constructor(options: AuthOptions) {
    this.clientId = options.clientId;
    this.clientSecret = options.clientSecret;
    this.prompt = options.prompt;
  }

  /**
   * Fetch credentials for the specified user.
   *
   * If no credentials are available, requests authorization.
   *
   * @param {String} user ID (email address) of user to get credentials for.
   * @param {String} scopes Authorization scopes to request
   * @returns {Promise.<google.auth.OAuth2>}
   */
  public async getUserCredentials(
    user: string,
    scopes: string[]
  ): Promise<OAuth2Client> {
    const oauth2Client = new OAuth2Client(
      this.clientId,
      this.clientSecret,
      this.redirectUrl
    );

    oauth2Client.on('tokens', (tokens: Credentials) => {
      if (tokens.refresh_token) {
        // debug("Saving refresh token");
        config.set('tokens', tokens);
      }
    });

    const tokens = config.get('tokens');

    if (tokens) {
      // debug("User previously authorized, refreshing");
      oauth2Client.setCredentials(tokens);
      await oauth2Client.getAccessToken();
      return oauth2Client;
    }

    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      login_hint: user
    });

    const code = await this.prompt(authUrl);
    const tokenResponse = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokenResponse.tokens);
    return oauth2Client;
  }
}
