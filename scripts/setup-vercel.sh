#!/usr/bin/env bash
# Run from a clone on the computer where Vercel is authenticated.
set -euo pipefail
repo=hbahadorzadeh/chessbuddy
command -v gh >/dev/null || { echo 'Install GitHub CLI first: https://cli.github.com'; exit 1; }
gh auth status
npm ci
npx --no-install vercel whoami
printf 'Vercel account/team slug (from your Vercel dashboard): '
read -r vercel_scope
[[ "$vercel_scope" =~ ^[a-zA-Z0-9_-]+$ ]] || { echo 'Invalid scope'; exit 1; }
# Create projects through Vercel link. It prompts if a project must be created.
for target in production preview; do
  project=chessbuddy
  if [ "$target" = preview ]; then project=chessbuddy-preview; fi
  printf '\nLinking %s project. Confirm project creation if prompted.\n' "$target"
  npx --no-install vercel link --project "$project" --scope "$vercel_scope"
  node -e 'const p=require("./.vercel/project.json");if(!p.orgId||!p.projectId)process.exit(1)'
  gh api --method PUT "repos/$repo/environments/$target" --silent
  node -e 'process.stdout.write(require("./.vercel/project.json").orgId)' | gh secret set VERCEL_ORG_ID --repo "$repo" --env "$target"
  node -e 'process.stdout.write(require("./.vercel/project.json").projectId)' | gh secret set VERCEL_PROJECT_ID --repo "$repo" --env "$target"
done
printf '\nCreate a token at https://vercel.com/account/settings/tokens scoped to this account/team.\n'
printf 'Paste token locally (hidden): '
IFS= read -rs chessbuddy_vercel_token
printf '\n'
[ -n "$chessbuddy_vercel_token" ] || { echo 'No token supplied'; exit 1; }
trap 'unset chessbuddy_vercel_token' EXIT
for target in production preview; do
  printf '%s' "$chessbuddy_vercel_token" | gh secret set VERCEL_TOKEN --repo "$repo" --env "$target"
done
unset chessbuddy_vercel_token
# Restore the production local project link without deploying.
npx --no-install vercel link --yes --project chessbuddy --scope "$vercel_scope"
echo 'Secrets configured. Enable deployment and trigger a main build when the application commit is on main:'
echo "gh variable set VERCEL_DEPLOY_ENABLED --repo $repo --body true"
echo "gh workflow run ci-deploy.yml --repo $repo --ref main"
echo 'For a private repository, check your GitHub plan supports environments before using this script.'
