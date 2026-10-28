interface ImportMetaEnv {
  /** The token of the site in Cloudflare Web Analytics. Without it, the app loads no analytics. */
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
  /** The source code of the site. The build config gives a default. */
  readonly VITE_GITHUB_URL: string;
}
