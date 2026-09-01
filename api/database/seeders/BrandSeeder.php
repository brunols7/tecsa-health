<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Infrastructure\Persistence\Eloquent\Models\Brand;
use Illuminate\Database\Seeder;

final class BrandSeeder extends Seeder
{
    /**
     * @var list<array{slug: string, display_name: string}>
     */
    private const BRANDS = [
        ['slug' => 'nutri-care', 'display_name' => 'NutriCare'],
        ['slug' => 'vita-plus', 'display_name' => 'VitaPlus'],
    ];

    public function run(): void
    {
        foreach (self::BRANDS as $brand) {
            Brand::query()->updateOrCreate(
                ['slug' => $brand['slug']],
                ['display_name' => $brand['display_name']],
            );
        }
    }
}
