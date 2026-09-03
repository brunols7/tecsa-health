<?php

declare(strict_types=1);

namespace App\Application\Patient;

use App\Domain\Biomarker\Biomarker;
use App\Domain\Biomarker\BiomarkerRepository;
use App\Domain\Brand\BrandRepository;
use App\Domain\FeatureFlag\Exceptions\BrandNotFound;
use App\Domain\Patient\Exceptions\InvalidStatusTransition;
use App\Domain\Patient\Exceptions\PatientNotFound;
use App\Domain\Patient\Patient;
use App\Domain\Patient\PatientCursor;
use App\Domain\Patient\PatientPage;
use App\Domain\Patient\PatientRepository;
use App\Domain\Patient\PatientStatus;
use Illuminate\Support\Carbon;

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

    public function create(string $name, string $birthDate, string $goal, string $brandSlug): Patient
    {
        $brand = $this->brands->findBySlug($brandSlug);

        if ($brand === null) {
            throw new BrandNotFound($brandSlug);
        }

        return $this->patients->insert($brand->id, $name, $birthDate, $goal);
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

    /**
     * @param  array<string, mixed>  $fields
     */
    public function update(string $id, array $fields): Patient
    {
        $this->assertValidId($id);

        return $this->patients->update($id, $fields);
    }

    public function changeStatus(string $id, string $targetStatus): Patient
    {
        $this->assertValidId($id);

        $current = $this->patients->findById($id);

        if ($current === null) {
            throw new PatientNotFound($id);
        }

        $from = PatientStatus::from($current->status);
        $to = PatientStatus::from($targetStatus);

        if (! $from->canTransitionTo($to)) {
            throw new InvalidStatusTransition($from->value, $to->value);
        }

        return $this->patients->updateStatus($id, $to->value, Carbon::now()->toIso8601String());
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
