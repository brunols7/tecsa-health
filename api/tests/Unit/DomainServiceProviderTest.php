<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentBrandRepository;
use App\Infrastructure\Persistence\Eloquent\EloquentFeatureFlagRepository;
use Tests\TestCase;

class DomainServiceProviderTest extends TestCase
{
    public function test_feature_flag_repository_resolves_to_eloquent_implementation(): void
    {
        $resolved = $this->app->make(FeatureFlagRepository::class);

        $this->assertInstanceOf(EloquentFeatureFlagRepository::class, $resolved);
    }

    public function test_brand_repository_resolves_to_eloquent_implementation(): void
    {
        $resolved = $this->app->make(BrandRepository::class);

        $this->assertInstanceOf(EloquentBrandRepository::class, $resolved);
    }
}
