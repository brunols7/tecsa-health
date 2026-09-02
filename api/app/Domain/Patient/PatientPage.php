<?php

declare(strict_types=1);

namespace App\Domain\Patient;

final class PatientPage
{
    /**
     * @param  array<int, Patient>  $items
     */
    public function __construct(
        public readonly array $items,
        public readonly ?string $nextCursor,
    ) {}
}
