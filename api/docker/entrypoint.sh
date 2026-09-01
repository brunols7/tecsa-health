#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then
    cp .env.example .env
fi

if [ ! -d vendor ]; then
    composer install --no-interaction --prefer-dist
fi

APP_KEY_VALUE=$(grep -E '^APP_KEY=' .env | cut -d '=' -f2- || true)
if [ -z "$APP_KEY_VALUE" ]; then
    php artisan key:generate --force
fi

WAIT_ATTEMPTS=0
until php artisan db:show >/dev/null 2>&1 || [ "$WAIT_ATTEMPTS" -ge 30 ]; do
    WAIT_ATTEMPTS=$((WAIT_ATTEMPTS + 1))
    sleep 1
done

php artisan migrate --force

PATIENT_COUNT=$(php artisan tinker --execute="echo App\Infrastructure\Persistence\Eloquent\Models\Patient::count();" 2>/dev/null | tail -n 1 || echo 0)
if [ "$PATIENT_COUNT" = "0" ]; then
    php artisan db:seed --force
fi

exec php artisan serve --host=0.0.0.0 --port="${APP_PORT:-9000}"
