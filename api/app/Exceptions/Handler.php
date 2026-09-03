<?php

declare(strict_types=1);

namespace App\Exceptions;

use App\Domain\AiAction\Exceptions\AiActionAlreadyResolved;
use App\Domain\AiAction\Exceptions\AiActionNotFound;
use App\Domain\AiAction\Exceptions\AiDisabled;
use App\Domain\AiAction\Exceptions\LlmUnavailable;
use App\Domain\AiAction\Exceptions\PatientNoBiomarkers;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\InvalidCursor;
use App\Domain\Patient\Exceptions\InvalidStatusFilter;
use App\Domain\Patient\Exceptions\InvalidStatusTransition;
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

        if ($e instanceof InvalidStatusFilter) {
            return $this->envelope('INVALID_STATUS_FILTER', $e->getMessage(), [], 400);
        }

        if ($e instanceof AiDisabled) {
            return $this->envelope('AI_DISABLED', $e->getMessage(), [], 503);
        }

        if ($e instanceof LlmUnavailable) {
            return $this->envelope('AI_UNAVAILABLE', $e->getMessage(), [], 502);
        }

        if ($e instanceof PatientNoBiomarkers) {
            return $this->envelope('PATIENT_NO_BIOMARKERS', $e->getMessage(), [], 422);
        }

        if ($e instanceof AiActionNotFound) {
            return $this->envelope('AI_ACTION_NOT_FOUND', $e->getMessage(), [], 404);
        }

        if ($e instanceof AiActionAlreadyResolved) {
            return $this->envelope('AI_ACTION_ALREADY_RESOLVED', $e->getMessage(), [], 409);
        }

        if ($e instanceof InvalidStatusTransition) {
            return $this->envelope('INVALID_STATUS_TRANSITION', $e->getMessage(), [], 409);
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
