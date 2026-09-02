<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\InvalidCursor;
use App\Domain\Patient\Exceptions\PatientNotFound;
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

        Route::get('/__test/patient-not-found', function (): never {
            throw new PatientNotFound('unknown-patient');
        });

        Route::get('/__test/invalid-cursor', function (): never {
            throw new InvalidCursor('garbage-cursor');
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

    public function test_patient_not_found_renders_404_envelope(): void
    {
        $response = $this->getJson('/__test/patient-not-found');

        $response->assertStatus(404);
        $response->assertJson([
            'error' => [
                'code' => 'PATIENT_NOT_FOUND',
                'message' => 'Patient not found: unknown-patient',
                'details' => [],
            ],
        ]);
    }

    public function test_invalid_cursor_renders_400_envelope(): void
    {
        $response = $this->getJson('/__test/invalid-cursor');

        $response->assertStatus(400);
        $response->assertJson([
            'error' => [
                'code' => 'INVALID_CURSOR',
                'message' => 'Invalid cursor: garbage-cursor',
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
