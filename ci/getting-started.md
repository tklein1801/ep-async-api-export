# CI

## Publish `@tklein1801/ep-async-api-export`

```bash
fly -t kleithor set-pipeline -p ep-async-api-export -c ./ci/publish.pipeline.yml -v repo_uri="git@github.com:tklein1801/ep-async-api-export.git" -v repo_private_key="$(cat ./ci/secrets/github/id_rsa)" -v version_bucket="$(cat ./ci/secrets/aws/bucket.txt | sed -n '3p')" -v service="ce_async_api_fix" -v service_name="ep-async-api-export" -v version_bucket_region="$(cat ./ci/secrets/aws/bucket.txt | sed -n '4p')" -v version_bucket_access_key="$(cat ./ci/secrets/aws/bucket.txt | sed -n '1p')" -v version_bucket_secret="$(cat ./ci/secrets/aws/bucket.txt | sed -n '2p')" -v npm_token="$(cat ./ci/secrets/npmjs/npm_token)" -v discord_webhook="$(cat ./ci/secrets/discord-webhook.txt)"
```
