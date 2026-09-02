<?php

declare(strict_types=1);

namespace App\Domain\Biomarker;

interface BiomarkerRepository
{
    /**
     * @return array<int, Biomarker>
     */
    public function listForPatient(string $patientId): array;
}
