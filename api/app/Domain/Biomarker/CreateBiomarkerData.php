<?php

declare(strict_types=1);

namespace App\Domain\Biomarker;

final class CreateBiomarkerData
{
    public function __construct(
        public readonly string $label,
        public readonly float $value,
        public readonly string $unit,
        public readonly float $refMin,
        public readonly float $refMax,
        public readonly string $measuredAt,
    ) {}
}
