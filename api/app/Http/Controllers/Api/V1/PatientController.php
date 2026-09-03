<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\V1;

use App\Application\Patient\PatientService;
use App\Http\Controllers\Controller;
use App\Http\Requests\CreateBiomarkerRequest;
use App\Http\Requests\ListPatientsRequest;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Http\Requests\UpdatePatientStatusRequest;
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
            $request->validated('status'),
        );

        return (new PatientPageResource($page))->response();
    }

    #[DocResponse(422, description: 'Invalid body')]
    #[DocResponse(404, description: 'Brand not found')]
    public function store(StorePatientRequest $request): JsonResponse
    {
        $patient = $this->patients->create(
            $request->validated('name'),
            $request->validated('birthDate'),
            $request->validated('goal'),
            $request->validated('brand'),
        );

        return (new PatientResource($patient))
            ->response()
            ->setStatusCode(201)
            ->header('Location', "/api/v1/patients/{$patient->id}");
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
    public function update(UpdatePatientRequest $request, string $id): JsonResponse
    {
        $patient = $this->patients->update($id, $request->validated());

        return (new PatientResource($patient))->response();
    }

    #[DocResponse(422, description: 'Invalid body')]
    #[DocResponse(404, description: 'Patient not found')]
    public function createBiomarker(CreateBiomarkerRequest $request, string $id): JsonResponse
    {
        $biomarker = $this->patients->createBiomarker($id, $request->toData());

        return (new BiomarkerResource($biomarker))
            ->response()
            ->setStatusCode(201)
            ->header('Location', "/api/v1/patients/{$id}/biomarkers");
    }

    #[DocResponse(422, description: 'Invalid body')]
    #[DocResponse(404, description: 'Patient not found')]
    #[DocResponse(409, description: 'Invalid status transition')]
    public function updateStatus(UpdatePatientStatusRequest $request, string $id): JsonResponse
    {
        $patient = $this->patients->changeStatus($id, $request->validated('status'));

        return (new PatientResource($patient))->response();
    }

    #[DocResponse(404, description: 'Patient not found')]
    public function destroy(string $id): JsonResponse
    {
        $this->patients->delete($id);

        return response()->json(null, 204);
    }
}
