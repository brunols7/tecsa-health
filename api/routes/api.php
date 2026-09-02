<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\FeatureFlagController;
use App\Http\Controllers\Api\V1\PatientController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('feature-flags', [FeatureFlagController::class, 'index']);
    Route::get('patients', [PatientController::class, 'index']);
    Route::get('patients/{id}', [PatientController::class, 'show']);
    Route::get('patients/{id}/biomarkers', [PatientController::class, 'biomarkers']);
    Route::patch('patients/{id}', [PatientController::class, 'updateFollowUp']);
});
