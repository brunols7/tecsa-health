<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\Models\Brand;
use App\Infrastructure\Persistence\Eloquent\Models\FeatureFlag;
use Illuminate\Database\Seeder;

final class FeatureFlagSeeder extends Seeder
{
    /**
     * @var array<string, bool>
     */
    private const FLAGS = [
        'aiActionsEnabled' => true,
        'offlineBanner' => true,
    ];

    public function run(): void
    {
        Brand::query()->each(function (Brand $brand): void {
            foreach (self::FLAGS as $key => $enabled) {
                FeatureFlag::query()->updateOrCreate(
                    ['brand_id' => $brand->id, 'key' => $key],
                    ['enabled' => $enabled],
                );
            }
        });
    }
}
