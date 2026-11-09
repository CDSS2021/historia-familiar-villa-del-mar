// @ts-check
import { defineConfig } from 'astro/config';

const [owner, repository] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
const githubPages = process.env.GITHUB_ACTIONS === 'true' && owner && repository;

export default defineConfig({
  ...(githubPages && {
    site: `https://${owner.toLowerCase()}.github.io`,
    base: repository.toLowerCase() === `${owner.toLowerCase()}.github.io` ? '/' : `/${repository}`,
  }),
  devToolbar: { enabled: false },
});
