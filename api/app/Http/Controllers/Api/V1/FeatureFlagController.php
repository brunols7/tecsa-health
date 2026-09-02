<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Application\FeatureFlag\FeatureFlagService;
use App\Http\Controllers\Controller;
use App\Http\Requests\ListFeatureFlagsRequest;
use Dedoc\Scramble\Attributes\Response as DocResponse;
use Illuminate\Http\JsonResponse;

final class FeatureFlagController extends Controller
{
    public function __construct(
        private readonly FeatureFlagService $featureFlags,
    ) {}

    #[DocResponse(404, description: 'Brand not found')]
    public function index(ListFeatureFlagsRequest $request): JsonResponse
    {
        $flags = $this->featureFlags->listForBrandSlug($request->validated('brand'));

        return response()->json($flags);
    }
}
