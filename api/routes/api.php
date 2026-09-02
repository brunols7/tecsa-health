<?php

declare(strict_types=1);

use App\Http\Controllers\Api\V1\FeatureFlagController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('feature-flags', [FeatureFlagController::class, 'index']);
});
