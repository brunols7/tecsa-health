<?php

declare(strict_types=1);

namespace App\Domain\Biomarker;

final class Biomarker
{
    public function __construct(
        public readonly string $id,
        public readonly string $patientId,
        public readonly string $code,
        public readonly string $label,
        public readonly float $value,
        public readonly string $unit,
        public readonly float $refMin,
        public readonly float $refMax,
        public readonly string $measuredAt,
        public readonly BiomarkerStatus $status,
    ) {}
}
