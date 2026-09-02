<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Application\Patient\PatientService;
use App\Http\Controllers\Controller;
use App\Http\Requests\ListPatientsRequest;
use App\Http\Requests\UpdateFollowUpRequest;
use App\Http\Resources\BiomarkerResource;
use App\Http\Resources\PatientPageResource;
use App\Http\Resources\PatientResource;
use Dedoc\Scramble\Attributes\Response as DocResponse;
use Illuminate\Http\JsonResponse;

final class PatientController extends Controller
{
    public function __construct(
        private readonly PatientService $patients,
    ) {}

    #[DocResponse(422, description: 'Invalid query parameters')]
    #[DocResponse(404, description: 'Brand not found')]
    #[DocResponse(400, description: 'Invalid cursor')]
    public function index(ListPatientsRequest $request): JsonResponse
    {
        $limit = $request->validated('limit');

        $page = $this->patients->listForBrandSlug(
            $request->validated('brand'),
            $request->validated('search'),
            $request->validated('cursor'),
            $limit !== null ? (int) $limit : null,
        );

        return (new PatientPageResource($page))->response();
    }

    #[DocResponse(404, description: 'Patient not found')]
    public function show(string $id): JsonResponse
    {
        $patient = $this->patients->getById($id);

        return (new PatientResource($patient))->response();
    }

    #[DocResponse(404, description: 'Patient not found')]
    public function biomarkers(string $id): JsonResponse
    {
        $biomarkers = $this->patients->listBiomarkers($id);

        return response()->json(BiomarkerResource::collection($biomarkers)->resolve());
    }

    #[DocResponse(422, description: 'Invalid body')]
    #[DocResponse(404, description: 'Patient not found')]
    public function updateFollowUp(UpdateFollowUpRequest $request, string $id): JsonResponse
    {
        $patient = $this->patients->setNeedsFollowUp($id, $request->boolean('needsFollowUp'));

        return (new PatientResource($patient))->response();
    }
}
