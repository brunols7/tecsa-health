<?php

declare(strict_types=1);

namespace App\Application\Patient;

use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\Patient;
use App\Domain\Patient\PatientCursor;
use App\Domain\Patient\PatientPage;
use App\Domain\Patient\PatientRepository;

final class PatientService
{
    private const DEFAULT_LIMIT = 50;

    private const MAX_LIMIT = 100;

    public function __construct(
        private readonly BrandRepository $brands,
        private readonly PatientRepository $patients,
        private readonly BiomarkerRepository $biomarkers,
    ) {}

    public function listForBrandSlug(
        string $brandSlug,
        ?string $search,
        ?string $rawCursor,
        ?int $limit,
    ): PatientPage {
        $brand = $this->brands->findBySlug($brandSlug);

        if ($brand === null) {
            throw new BrandNotFound($brandSlug);
        }

        $cursor = $rawCursor !== null ? PatientCursor::decode($rawCursor) : null;

        return $this->patients->paginate($brand->id, $search, $cursor, $this->clampLimit($limit));
    }

    public function getById(string $id): Patient
    {
        $patient = $this->patients->findById($id);

        if ($patient === null) {
            throw new PatientNotFound($id);
        }

        return $patient;
    }

    /**
     * @return array<int, Biomarker>
     */
    public function listBiomarkers(string $patientId): array
    {
        if ($this->patients->findById($patientId) === null) {
            throw new PatientNotFound($patientId);
        }

        return $this->biomarkers->listForPatient($patientId);
    }

    public function setNeedsFollowUp(string $id, bool $value): Patient
    {
        return $this->patients->updateNeedsFollowUp($id, $value);
    }

    private function clampLimit(?int $limit): int
    {
        if ($limit === null) {
            return self::DEFAULT_LIMIT;
        }

        return min($limit, self::MAX_LIMIT);
    }
}
