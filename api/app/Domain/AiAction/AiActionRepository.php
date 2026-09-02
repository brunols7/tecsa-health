<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

interface AiActionRepository
{
    public function findById(string $id): ?AiAction;

    /**
     * @return array<int, AiAction>
     */
    public function listForPatient(string $patientId): array;

    /**
     * @return array<int, AiAction>
     */
    public function findByPatientAndHash(string $patientId, string $inputHash): array;

    /**
     * @param  array<int, AiAction>  $actions
     */
    public function insertMany(array $actions): void;

    public function updateStatus(string $id, AiActionStatus $status): AiAction;
}
