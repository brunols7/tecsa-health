<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use Illuminate\Support\Facades\Route;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ExceptionHandlerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        Route::get('/__test/brand-not-found', function (): never {
            throw new BrandNotFound('unknown-brand');
        });

        Route::get('/__test/validation-error', function (): never {
            throw ValidationException::withMessages(['brand' => ['The brand field is required.']]);
        });
    }

    public function test_brand_not_found_renders_404_envelope(): void
    {
        $response = $this->getJson('/__test/brand-not-found');

        $response->assertStatus(404);
        $response->assertJson([
            'error' => [
                'code' => 'BRAND_NOT_FOUND',
                'message' => 'Brand not found: unknown-brand',
                'details' => [],
            ],
        ]);
    }

    public function test_validation_exception_renders_422_envelope(): void
    {
        $response = $this->getJson('/__test/validation-error');

        $response->assertStatus(422);
        $response->assertJson([
            'error' => [
                'code' => 'VALIDATION_ERROR',
                'details' => [
                    'brand' => ['The brand field is required.'],
                ],
            ],
        ]);
        $response->assertJsonStructure(['error' => ['code', 'message', 'details']]);
    }
}
