<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\InvalidCursor;
use App\Domain\Patient\Exceptions\PatientNotFound;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

final class Handler
{
    public function render(Throwable $e, Request $request): ?JsonResponse
    {
        if ($e instanceof BrandNotFound) {
            return $this->envelope('BRAND_NOT_FOUND', $e->getMessage(), [], 404);
        }

        if ($e instanceof PatientNotFound) {
            return $this->envelope('PATIENT_NOT_FOUND', $e->getMessage(), [], 404);
        }

        if ($e instanceof InvalidCursor) {
            return $this->envelope('INVALID_CURSOR', $e->getMessage(), [], 400);
        }

        if ($e instanceof ValidationException) {
            return $this->envelope(
                'VALIDATION_ERROR',
                $e->getMessage(),
                $e->errors(),
                $e->status,
            );
        }

        return null;
    }

    /**
     * @param  array<string, list<string>>  $details
     */
    private function envelope(string $code, string $message, array $details, int $status): JsonResponse
    {
        return new JsonResponse([
            'error' => [
                'code' => $code,
                'message' => $message,
                'details' => $details,
            ],
        ], $status);
    }
}
