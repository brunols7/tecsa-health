<?php

declare(strict_types=1);

namespace App\Domain\Patient;

interface PatientRepository
{
    public function paginate(
        string $brandId,
        ?string $search,
        ?PatientCursor $cursor,
        int $limit,
    ): PatientPage;

    public function findById(string $id): ?Patient;

    public function updateNeedsFollowUp(string $id, bool $needsFollowUp): Patient;
}
