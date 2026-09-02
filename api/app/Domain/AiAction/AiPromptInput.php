<?php

declare(strict_types=1);

namespace App\Domain\AiAction;

final class AiPromptInput
{
    /**
     * @param  array<int, array{code: string, value: float, unit: string, refMin: float, refMax: float}>  $biomarkers
     */
    public function __construct(
        public readonly int $age,
        public readonly string $goal,
        public readonly array $biomarkers,
    ) {}
}
