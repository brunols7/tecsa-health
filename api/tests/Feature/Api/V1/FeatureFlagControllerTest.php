<?php

declare(strict_types=1);

namespace Tests\Feature\Api\V1;

use Database\Seeders\BrandSeeder;
use Database\Seeders\FeatureFlagSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FeatureFlagControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_200_with_flag_map_for_a_known_brand(): void
    {
        $this->seed(BrandSeeder::class);
        $this->seed(FeatureFlagSeeder::class);

        $response = $this->getJson('/api/v1/feature-flags?brand=nutri-care');

        $response->assertStatus(200);
        $response->assertExactJson([
            'aiActionsEnabled' => true,
            'offlineBanner' => true,
        ]);
    }

    public function test_returns_200_with_empty_map_when_brand_has_no_flags(): void
    {
        $this->seed(BrandSeeder::class);

        $response = $this->getJson('/api/v1/feature-flags?brand=nutri-care');

        $response->assertStatus(200);
        $response->assertExactJson([]);
    }

    public function test_returns_422_when_brand_param_is_missing(): void
    {
        $response = $this->getJson('/api/v1/feature-flags');

        $response->assertStatus(422);
        $response->assertJsonStructure(['error' => ['code', 'message', 'details']]);
        $response->assertJsonPath('error.code', 'VALIDATION_ERROR');
    }

    public function test_returns_404_when_brand_does_not_exist(): void
    {
        $this->seed(BrandSeeder::class);

        $response = $this->getJson('/api/v1/feature-flags?brand=unknown-brand');

        $response->assertStatus(404);
        $response->assertJsonStructure(['error' => ['code', 'message', 'details']]);
        $response->assertJsonPath('error.code', 'BRAND_NOT_FOUND');
    }
}
