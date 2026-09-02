<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

final class AiAction
{
    public function __construct(
        public readonly string $id,
        public readonly string $patientId,
        public readonly string $title,
        public readonly string $rationale,
        public readonly string $priority,
        public readonly array $biomarkers,
        public readonly AiActionStatus $status,
        public readonly string $inputHash,
        public readonly string $createdAt,
    ) {}
}
