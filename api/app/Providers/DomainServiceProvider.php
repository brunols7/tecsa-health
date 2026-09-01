<?php

declare(strict_types=1);

namespace App\Providers;

use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentFeatureFlagRepository;
use Illuminate\Support\ServiceProvider;

final class DomainServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(FeatureFlagRepository::class, EloquentFeatureFlagRepository::class);
    }
}
