<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\FeatureFlag\FeatureFlagRepository;
use App\Infrastructure\Persistence\Eloquent\Models\Brand as BrandModel;
use Database\Seeders\BrandSeeder;
use Database\Seeders\FeatureFlagSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeatureFlagRepositoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_finds_a_seeded_flag_by_key_and_brand(): void
    {
        $this->seed(BrandSeeder::class);
        $this->seed(FeatureFlagSeeder::class);

        $brand = BrandModel::query()->where('slug', 'nutri-care')->firstOrFail();

        $repository = $this->app->make(FeatureFlagRepository::class);

        $flag = $repository->findByKeyAndBrand('aiActionsEnabled', $brand->id);

        $this->assertNotNull($flag);
        $this->assertSame('aiActionsEnabled', $flag->key);
        $this->assertSame($brand->id, $flag->brandId);
        $this->assertTrue($flag->enabled);
    }

    public function test_all_for_brand_returns_every_flag_seeded_for_that_brand(): void
    {
        $this->seed(BrandSeeder::class);
        $this->seed(FeatureFlagSeeder::class);

        $brand = BrandModel::query()->where('slug', 'nutri-care')->firstOrFail();

        $repository = $this->app->make(FeatureFlagRepository::class);

        $flags = $repository->allForBrand($brand->id);

        $this->assertCount(2, $flags);
        $keys = array_map(fn ($flag) => $flag->key, $flags);
        $this->assertContains('aiActionsEnabled', $keys);
        $this->assertContains('offlineBanner', $keys);
        foreach ($flags as $flag) {
            $this->assertSame($brand->id, $flag->brandId);
        }
    }

    public function test_all_for_brand_returns_empty_array_when_brand_has_no_flags(): void
    {
        $this->seed(BrandSeeder::class);

        $brand = BrandModel::query()->where('slug', 'nutri-care')->firstOrFail();

        $repository = $this->app->make(FeatureFlagRepository::class);

        $flags = $repository->allForBrand($brand->id);

        $this->assertSame([], $flags);
    }
}
