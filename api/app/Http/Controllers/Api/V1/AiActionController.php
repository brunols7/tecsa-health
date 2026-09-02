<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Application\AiAction\AiActionService;
use App\Domain\AiAction\AiActionStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\DecideAiActionRequest;
use App\Http\Requests\GenerateAiActionsRequest;
use App\Http\Resources\AiActionResource;
use Dedoc\Scramble\Attributes\Response as DocResponse;
use Illuminate\Http\JsonResponse;

final class AiActionController extends Controller
{
    public function __construct(
        private readonly AiActionService $aiActions,
    ) {}

    #[DocResponse(404, description: 'Patient not found')]
    #[DocResponse(422, description: 'Patient has no biomarkers')]
    #[DocResponse(429, description: 'Rate limit exceeded')]
    #[DocResponse(502, description: 'Llm provider unavailable')]
    #[DocResponse(503, description: 'Ai actions disabled')]
    public function generate(GenerateAiActionsRequest $request, string $patientId): JsonResponse
    {
        $result = $this->aiActions->generate($patientId, $request->wantsRefresh());

        return response()->json(
            AiActionResource::collection($result->actions)->resolve(),
            $result->generated ? 201 : 200,
        );
    }

    #[DocResponse(404, description: 'Patient not found')]
    #[DocResponse(503, description: 'Ai actions disabled')]
    public function index(string $patientId): JsonResponse
    {
        $actions = $this->aiActions->listForPatient($patientId);

        return response()->json(AiActionResource::collection($actions)->resolve());
    }

    #[DocResponse(404, description: 'Ai action not found')]
    #[DocResponse(409, description: 'Ai action already resolved')]
    #[DocResponse(422, description: 'Invalid body')]
    #[DocResponse(503, description: 'Ai actions disabled')]
    public function decide(DecideAiActionRequest $request, string $actionId): JsonResponse
    {
        $action = $this->aiActions->decide(
            $actionId,
            AiActionStatus::fromString($request->validated('status')),
        );

        return (new AiActionResource($action))->response();
    }
}
