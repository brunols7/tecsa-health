<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Application\FeatureFlag\FeatureFlagService;
use App\Domain\Brand\Brand;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\FeatureFlag\FeatureFlag;
use App\Domain\FeatureFlag\FeatureFlagRepository;
use Mockery;
use Tests\TestCase;

class FeatureFlagServiceTest extends TestCase
{
    public function test_returns_key_to_enabled_map_when_brand_has_flags(): void
    {
        $brand = new Brand(id: 'brand-1', slug: 'nutri-care');

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('nutri-care')->andReturn($brand);

        $featureFlags = Mockery::mock(FeatureFlagRepository::class);
        $featureFlags->shouldReceive('allForBrand')->with('brand-1')->andReturn([
            new FeatureFlag(key: 'aiActionsEnabled', brandId: 'brand-1', enabled: true),
            new FeatureFlag(key: 'offlineBanner', brandId: 'brand-1', enabled: false),
        ]);

        $service = new FeatureFlagService($brands, $featureFlags);

        $result = $service->listForBrandSlug('nutri-care');

        $this->assertSame(['aiActionsEnabled' => true, 'offlineBanner' => false], $result);
    }

    public function test_throws_brand_not_found_when_slug_does_not_resolve(): void
    {
        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('unknown')->andReturn(null);

        $featureFlags = Mockery::mock(FeatureFlagRepository::class);
        $featureFlags->shouldNotReceive('allForBrand');

        $service = new FeatureFlagService($brands, $featureFlags);

        $this->expectException(BrandNotFound::class);

        $service->listForBrandSlug('unknown');
    }

    public function test_returns_empty_array_when_brand_has_no_flags(): void
    {
        $brand = new Brand(id: 'brand-2', slug: 'vita-plus');

        $brands = Mockery::mock(BrandRepository::class);
        $brands->shouldReceive('findBySlug')->with('vita-plus')->andReturn($brand);

        $featureFlags = Mockery::mock(FeatureFlagRepository::class);
        $featureFlags->shouldReceive('allForBrand')->with('brand-2')->andReturn([]);

        $service = new FeatureFlagService($brands, $featureFlags);

        $result = $service->listForBrandSlug('vita-plus');

        $this->assertSame([], $result);
    }
}
