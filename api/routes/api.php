<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\AiActionController;
use App\Http\Controllers\Api\V1\FeatureFlagController;
use App\Http\Controllers\Api\V1\PatientController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('feature-flags', [FeatureFlagController::class, 'index']);
    Route::get('patients', [PatientController::class, 'index']);
    Route::post('patients', [PatientController::class, 'store']);
    Route::get('patients/{id}', [PatientController::class, 'show']);
    Route::get('patients/{id}/biomarkers', [PatientController::class, 'biomarkers']);
    Route::post('patients/{id}/biomarkers', [PatientController::class, 'createBiomarker']);
    Route::patch('patients/{id}', [PatientController::class, 'update']);
    Route::patch('patients/{id}/status', [PatientController::class, 'updateStatus']);
    Route::delete('patients/{id}', [PatientController::class, 'destroy']);
    Route::get('patients/{id}/ai-actions', [AiActionController::class, 'index']);
    Route::post('patients/{id}/ai-actions', [AiActionController::class, 'generate'])
        ->middleware('throttle:ai');
    Route::patch('ai-actions/{id}', [AiActionController::class, 'decide']);
    Route::delete('ai-actions/{id}', [AiActionController::class, 'delete']);
});
