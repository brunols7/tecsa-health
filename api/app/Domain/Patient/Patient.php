<?php

declare(strict_types=1);

namespace App\Domain\Patient;

final class Patient
{
    public function __construct(
        public readonly string $id,
        public readonly string $brandId,
        public readonly string $name,
        public readonly string $birthDate,
        public readonly string $goal,
        public readonly string $status,
        public readonly bool $needsFollowUp,
        public readonly string $updatedAt,
    ) {}
}
