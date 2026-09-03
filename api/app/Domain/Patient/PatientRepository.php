<?php

declare(strict_types=1);

namespace App\Domain\Patient;

interface PatientRepository
{
    /**
     * @param  array<int, string>  $statuses
     */
    public function paginate(
        string $brandId,
        ?string $search,
        ?PatientCursor $cursor,
        int $limit,
        array $statuses = ['active'],
    ): PatientPage;

    public function findById(string $id): ?Patient;

    public function updateNeedsFollowUp(string $id, bool $needsFollowUp): Patient;

    public function insert(string $brandId, string $name, string $birthDate, string $goal): Patient;

    /**
     * @param  array<string, mixed>  $fields
     */
    public function update(string $id, array $fields): Patient;

    public function updateStatus(string $id, string $status, string $statusChangedAt): Patient;

    public function delete(string $id): void;
}
