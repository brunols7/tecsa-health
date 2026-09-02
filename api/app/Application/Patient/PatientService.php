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

    private const UUID_PATTERN = '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i';

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
        $this->assertValidId($id);

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
        $this->assertValidId($patientId);

        if ($this->patients->findById($patientId) === null) {
            throw new PatientNotFound($patientId);
        }

        return $this->biomarkers->listForPatient($patientId);
    }

    public function setNeedsFollowUp(string $id, bool $value): Patient
    {
        $this->assertValidId($id);

        return $this->patients->updateNeedsFollowUp($id, $value);
    }

    private function assertValidId(string $id): void
    {
        if (preg_match(self::UUID_PATTERN, $id) !== 1) {
            throw new PatientNotFound($id);
        }
    }

    private function clampLimit(?int $limit): int
    {
        if ($limit === null) {
            return self::DEFAULT_LIMIT;
        }

        return min($limit, self::MAX_LIMIT);
    }
}
